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

        var result = await connection.ExecuteAsync(
            "INSERT INTO jobs (id, status, webhook_token, s3_key) VALUES (@Id,'Pending', @WebhookToken, @Filename)",
            new
            {
                Id = jobUuid,
                Filename = request.Filename,
                WebhookToken = webhookToken
            });
        string s3Url = awsClient.CreatePresignedUrl(request.Filename);

        return Results.Ok(new
        {
            JobId = jobUuid,
            UploadUrl = s3Url
        });
    })
    .WithName("CreateJob");

app.Run();

public record CreateJobRequest(string Filename);