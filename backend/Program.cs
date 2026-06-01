using System;
using System.Data;
using System.Runtime.InteropServices.JavaScript;
using NanoidDotNet;
using backend.Clients;
using Dapper;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    throw new ArgumentNullException();
}

builder.Services.AddNpgsqlDataSource(connectionString);
builder.Services.AddOpenApi();
builder.Services.AddSingleton<AwsClient>();
var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapPost("api/jobs", async (NpgsqlDataSource dataSource, CreateJobRequest request, AwsClient awsClient) =>
    {
        string jobUuid = Guid.NewGuid().ToString();
        string webhookToken = Nanoid.Generate();

        await using var connection = await dataSource.OpenConnectionAsync();
        string query =
            "INSERT INTO jobs (id, status, webhook_token, s3_key) VALUES (@Id,'Pending', @WebhookToken, @Filename)";
        var result = await connection.ExecuteAsync(
            query,
            new
            {
                Id = jobUuid,
                Filename = request.Filename,
                WebhookToken = webhookToken
            });

        if (result == 0)
        {
            return Results.Problem("Failed to insert job.");
        }
        string s3Url = awsClient.CreatePresignedUrl(request.Filename);

        return Results.Ok(new
        {
            JobId = jobUuid,
            UploadUrl = s3Url
        });
    })
    .WithName("CreateJob");

app.MapGet("api/jobs", async (NpgsqlDataSource dataSource, GetJobRequest request) =>
    {
        await using var connection = await dataSource.OpenConnectionAsync();

        string query = "SELECT status FROM jobs WHERE id = @jobUUID";
        var job = await connection.QueryFirstOrDefaultAsync<JobStatus>(query,
            new
            {
                jobUUID = request.jobUuid
            });

        if (job == null)
        {
            return Results.NotFound();
        }

        return Results.Ok(job);
    })
    .WithName("GetJob");

app.MapPost("api/webhooks/complete", async (NpgsqlDataSource dataSource, CompleteJobRequest request) =>
    {
        await using var connection = await dataSource.OpenConnectionAsync();

        string query = "SELECT * FROM jobs WHERE id = @jobUUID";
        var job = await connection.QueryFirstOrDefaultAsync<Job>(query,
            new
            {
                JobUUID = request.jobUuid
            });
        if (job == null)
        {
            return Results.NotFound();
        }

        if (request.webhookToken != job.webhookToken)
        {
            return Results.Unauthorized();
        }

        string updateQuery = "UPDATE jobs SET status = @status WHERE id = @jobUUID";
        var updateJob = await connection.ExecuteAsync(updateQuery,
            new
            {
                jobUUID = request.jobUuid,
                status = "Completed"
            });

        if (updateJob == 0)
        {
            return Results.Problem("Failed to update job.");
        }

        return Results.Ok();
    })
    .WithName("CompleteJob");
app.Run();

public record CreateJobRequest(string Filename);

public record GetJobRequest(string jobUuid);

public record JobStatus(string Status);

public record Job(string id, string status, string webhookToken, string s3Key, string createdAt);

public record CompleteJobRequest(string jobUuid, string webhookToken);