using Amazon.S3.Model;
using Amazon;
using System;
using System.Linq.Expressions;
using Amazon.S3;

namespace backend.Clients;

public class AwsClient
{
    private readonly string bucketName = "uploads-891377227248-eu-north-1-an";
    private readonly int urlDuration = 1; // Hours
    private readonly IAmazonS3 _s3Client = new AmazonS3Client(RegionEndpoint.EUNorth1);
    
    internal string CreatePresignedUrl(string filename, string folder = "uploads")
    {
        string urlString = "";
        try
        {
            var request = new GetPreSignedUrlRequest()
            {
                BucketName = bucketName,
                Key = $"{folder}/{filename}",
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddHours(urlDuration)
            };
            urlString = _s3Client.GetPreSignedURL(request);

        }
        catch (AmazonS3Exception ex)
        {
            Console.WriteLine($@"Error: {ex.Message}");
        }

        if (string.IsNullOrEmpty(urlString))
        {
            throw new ArgumentNullException();
        }

        return urlString;
    }

}