using FracGen.Api.Fractals;
using FracGen.Api.Imaging;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 32_768);

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", application = "FracGen Web" }));

app.MapPost("/api/fractals/render", async (FractalRequest request, CancellationToken cancellationToken) =>
{
    var errors = request.Validate();
    if (errors.Count != 0)
        return Results.BadRequest(new { errors });

    // Each request is independent; cancelling the browser request interrupts the render.
    var rgba = await Task.Run(() => FractalRenderer.Render(request, cancellationToken), cancellationToken);
    cancellationToken.ThrowIfCancellationRequested();
    var png = PngEncoder.Encode(request.Width, request.Height, rgba);
    return Results.File(png, "image/png", enableRangeProcessing: false);
});

// Included only in the production Docker build (where wwwroot contains Vite's dist files).
app.MapFallbackToFile("index.html");
app.Run();

// Allows integration testing with WebApplicationFactory if needed later.
public partial class Program { }
