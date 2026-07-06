# Konvertify 

Konvertify is a modern, serverless cloud application that instantly converts your eBooks (specifically `.epub`) into Amazon's proprietary `.kfx` format. It uses an event-driven architecture built across AWS and Supabase to provide lightning-fast, highly scalable conversions without bogging down a traditional web server.

##  Architecture Overview

The system is completely decoupled and split into four main components:

1. **Frontend (React / Vite on Vercel)**
   - Provides a sleek, modern UI for users to upload their `.epub` files.
   - Uploads files *directly* to AWS S3 using highly secure Presigned URLs (bypassing the API layer for maximum upload speed).
   - Listens to a Supabase Realtime WebSocket to get instantaneous live updates on the conversion status.

2. **Backend API (.NET 8 Minimal API on AWS Lambda)**
   - Acts as the secure traffic controller.
   - Generates the mathematically-signed AWS S3 Presigned URLs for uploads and downloads.
   - Provides a highly secure Webhook endpoint to mark jobs as complete in the database.
   - Uses `Dapper` for lightning-fast database interactions.

3. **Database (Supabase / PostgreSQL)**
   - Tracks the state of all conversion jobs (`Pending`, `Processing`, `Completed`, `Failed`).
   - Uses Supabase Realtime to broadcast row changes directly to the React frontend.

4. **Worker (Python on AWS ECS Fargate)**
   - An event-driven, containerized worker. 
   - Uses the Calibre `ebook-convert` CLI with the KFX Output plugin.
   - Triggered automatically when a file lands in S3.
   - Securely posts to the C# Webhook with an `X-Webhook-Token` upon completion.

## Tech Stack

* **Frontend:** React, TypeScript, Vite, TailwindCSS
* **Backend:** C# .NET 8 Minimal APIs, Dapper, Npgsql
* **Cloud Platform:** AWS (Lambda, API Gateway, S3, ECS Fargate, CloudWatch)
* **Database:** Supabase (PostgreSQL, Realtime)
* **Conversion Engine:** Calibre (KFX Output Plugin)

## How It Works (The Pipeline)

1. **Initialize**: The React app asks the C# API Gateway for an S3 Upload URL.
2. **Upload**: The C# API creates a job in Supabase and returns an S3 Presigned URL. The React app directly PUTs the file into the S3 Bucket.
3. **Trigger**: S3/EventBridge notices the new file and spins up an ephemeral ECS Fargate container.
4. **Convert**: The Python script downloads the `.epub`, runs Calibre, and uploads the `.kfx` back to S3.
5. **Webhook**: The Python script fires a POST request to the C# API Gateway containing a secure token.
6. **Broadcast**: The C# API updates the Supabase database row to `Completed`.
7. **Download**: Supabase Realtime instantly pings the React app, which fetches a Download Presigned URL and presents it to the user.
