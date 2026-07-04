using System;
using System.IO;
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
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);
builder.Services.AddNpgsqlDataSource(connectionString);
builder.Services.AddSingleton<AwsClient>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "https://konvertify-tau.vercel.app")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();


// Configure the HTTP request pipeline.

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.MapPost("api/jobs", async (NpgsqlDataSource dataSource, CreateJobRequest request, AwsClient awsClient, ILogger<Program> logger) =>
    {
        logger.LogInformation("Received request to create job for file: {Filename}", request.Filename);
        
        string jobUuid = Guid.NewGuid().ToString();

        await using var connection = await dataSource.OpenConnectionAsync();
        string actualS3Key = $"uploads/{jobUuid}-{request.Filename}";
        string query =
            "INSERT INTO jobs (id, status, webhook_token, s3_key) VALUES (@Id,'Pending', '', @S3Key)";
        var result = await connection.ExecuteAsync(
            query,
            new
            {
                Id = jobUuid,
                S3Key = actualS3Key
            });

        if (result == 0)
        {
            logger.LogError("Failed to insert job {JobId} into the database.", jobUuid);
            return Results.Problem("Failed to insert job.");
        }
        logger.LogInformation("Successfully created job {JobId}. Generating S3 Upload URL...", jobUuid);
        string s3Url = awsClient.CreatePresignedUrl(actualS3Key);
        
        logger.LogInformation("S3 Upload URL generated for job {JobId}. Returning to client.", jobUuid);
        return Results.Ok(new
        {
            JobId = jobUuid,
            UploadUrl = s3Url
        });
    })
    .WithName("CreateJob");

app.MapGet("api/jobs", async (NpgsqlDataSource dataSource, AwsClient awsClient, [AsParameters] GetJobRequest request, ILogger<Program> logger) =>
    {
        logger.LogInformation("Checking status for job: {JobId}", request.jobUuid);
        await using var connection = await dataSource.OpenConnectionAsync();

        string query = "SELECT status, s3_key as S3Key FROM jobs WHERE id = @jobUUID";
        var job = await connection.QueryFirstOrDefaultAsync<JobStatusResult>(query,
            new
            {
                jobUUID = request.jobUuid
            });

        if (job == null)
        {
            logger.LogWarning("Status check failed: Job {JobId} not found in database.", request.jobUuid);
            return Results.NotFound();
        }
        
        string downloadURL = null;
        if (job.Status == "Completed")
        {
            string downloadS3Key = "converted/" + Path.GetFileNameWithoutExtension(job.S3Key) + ".kfx";
            downloadURL = awsClient.CreatePresignedUrl(downloadS3Key);
        }

        logger.LogInformation("Job {JobId} status is: {Status}", request.jobUuid, job.Status);
        return Results.Ok(new
        {
            status = job.Status,
            downloadUrl = downloadURL
        });
    })
    .WithName("GetJob");

app.MapPost("api/webhooks/complete", async (NpgsqlDataSource dataSource, CompleteJobRequest request, IConfiguration config, ILogger<Program> logger) =>
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

        var staticToken = config["WebhookSecret"] ?? "SUPER_SECRET_WEBHOOK_KEY";
        if (request.webhookToken != staticToken)
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

public record JobStatusResult(string Status, string S3Key);

public record Job(string id, string status, string webhookToken, string s3Key, string createdAt);

public record CompleteJobRequest(string jobUuid, string webhookToken);