using System;
using NanoidDotNet;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapPost("api/jobs", () =>
    {
        string jobUuid = Guid.NewGuid().ToString();
        string webhookToken = Nanoid.Generate();
        string s3Url = GenerateS3Url();
        

    })
    .WithName("CreateJob");

string GenerateS3Url()
{
    return "";
}
app.Run();