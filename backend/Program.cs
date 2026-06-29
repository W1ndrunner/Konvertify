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

app.MapPost("api/jobs", async (NpgsqlDataSource dataSource, CreateJobRequest request, AwsClient awsClient, ILogger<Program> logger) =>
    {
        logger.LogInformation("Received request to create job for file: {Filename}", request.Filename);
        
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
            logger.LogError("Failed to insert job {JobId} into the database.", jobUuid);
            return Results.Problem("Failed to insert job.");
        }
        logger.LogInformation("Successfully created job {JobId}. Generating S3 Upload URL...", jobUuid);
        string s3Url = awsClient.CreatePresignedUrl(request.Filename);
        
        logger.LogInformation("S3 Upload URL generated for job {JobId}. Returning to client.", jobUuid);
        return Results.Ok(new
        {
            JobId = jobUuid,
            UploadUrl = s3Url
        });
    })
    .WithName("CreateJob");

app.MapGet("api/jobs", async (NpgsqlDataSource dataSource, [AsParameters] GetJobRequest request, ILogger<Program> logger) =>
    {
        logger.LogInformation("Checking status for job: {JobId}", request.jobUuid);
        await using var connection = await dataSource.OpenConnectionAsync();

        string query = "SELECT status FROM jobs WHERE id = @jobUUID";
        var job = await connection.QueryFirstOrDefaultAsync<JobStatus>(query,
            new
            {
                jobUUID = request.jobUuid
            });

        if (job == null)
        {
            logger.LogWarning("Status check failed: Job {JobId} not found in database.", request.jobUuid);
            return Results.NotFound();
        }
        logger.LogInformation("Job {JobId} status is: {Status}", request.jobUuid, job.Status);
        return Results.Ok(job);
    })
    .WithName("GetJob");

app.MapPost("api/webhooks/complete", async (NpgsqlDataSource dataSource, CompleteJobRequest request, ILogger<Program> logger) =>
    {
        logger.LogInformation("Received webhook completion signal for job: {JobId}", request.jobUuid);
        await using var connection = await dataSource.OpenConnectionAsync();

        string query = "SELECT * FROM jobs WHERE id = @jobUUID";
        var job = await connection.QueryFirstOrDefaultAsync<Job>(query,
            new
            {
                JobUUID = request.jobUuid
            });
        if (job == null)
        {
            logger.LogWarning("Webhook failed: Job {JobId} not found.", request.jobUuid);
            return Results.NotFound();
        }

        if (request.webhookToken != job.webhookToken)
        {
            logger.LogWarning("Webhook unauthorized for job {JobId}. Token mismatch.", request.jobUuid);
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
            logger.LogError("Webhook failed: Could not update status to 'Completed' for job {JobId}.", request.jobUuid);
            return Results.Problem("Failed to update job.");
        }
        logger.LogInformation("Job {JobId} successfully marked as Completed via webhook!", request.jobUuid);
        return Results.Ok();
    })
    .WithName("CompleteJob");
app.Run();

public record CreateJobRequest(string Filename);

public record GetJobRequest(string jobUuid);

public record JobStatus(string Status);

public record Job(string id, string status, string webhookToken, string s3Key, string createdAt);

public record CompleteJobRequest(string jobUuid, string webhookToken);