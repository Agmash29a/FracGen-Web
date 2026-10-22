using FracGen.Api.Fractals;
using FracGen.Api.Imaging;
using Xunit;

namespace FracGen.Api.Tests;

public class FractalRendererTests
{
    [Fact]
    public void MandelbrotOriginIsBlack()
    {
        var request = new FractalRequest { Width = 100, Height = 100, XMin = -1, XMax = 1, YMin = -1, YMax = 1 };
        var rgba = FractalRenderer.Render(request);
        var offset = (50 * 100 + 50) * 4;
        Assert.Equal(new byte[] { 0, 0, 0, 255 }, rgba.Skip(offset).Take(4).ToArray());
    }

    [Fact]
    public void JuliaAtZeroWithZeroCIsBlack()
    {
        var request = new FractalRequest
        {
            Type = "julia-quadratic", Width = 100, Height = 100,
            XMin = -1, XMax = 1, YMin = -1, YMax = 1, CReal = 0, CImag = 0
        };
        var rgba = FractalRenderer.Render(request);
        var offset = (50 * 100 + 50) * 4;
        Assert.Equal(new byte[] { 0, 0, 0, 255 }, rgba.Skip(offset).Take(4).ToArray());
    }

    [Fact]
    public void PngHasExpectedSignatureAndDimensions()
    {
        var request = new FractalRequest { Width = 100, Height = 100 };
        var png = PngEncoder.Encode(request.Width, request.Height, FractalRenderer.Render(request));
        Assert.Equal(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, png.Take(8).ToArray());
        Assert.Equal(100, System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16, 4)));
        Assert.Equal(100, System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20, 4)));
    }

    [Theory]
    [InlineData("mandelbrot")]
    [InlineData("julia-quadratic")]
    [InlineData("julia-exponential")]
    [InlineData("julia-sine-exponential")]
    [InlineData("julia-cexp")]
    public void EveryOriginalFormulaProducesOpaquePixels(string formula)
    {
        var request = new FractalRequest { Type = formula, Width = 100, Height = 100, Iterations = 20 };
        var pixels = FractalRenderer.Render(request);
        Assert.Equal(100 * 100 * 4, pixels.Length);
        Assert.True(Enumerable.Range(0, 100 * 100).All(i => pixels[i * 4 + 3] == 255));
    }

    [Theory]
    [InlineData("purple-haze")]
    [InlineData("rhapsody-in-blue")]
    [InlineData("just-the-set")]
    [InlineData("line")]
    [InlineData("circle")]
    [InlineData("waves")]
    [InlineData("rgb-modifier")]
    public void EveryOriginalPaletteCanRender(string palette)
    {
        var request = new FractalRequest { Palette = palette, Width = 100, Height = 100, Iterations = 20 };
        Assert.Equal(100 * 100 * 4, FractalRenderer.Render(request).Length);
    }

    [Fact]
    public void UnsafeOrHugeRequestsAreRejected()
    {
        Assert.NotEmpty(new FractalRequest { Width = 1600, Height = 1200, Iterations = 1000 }.Validate());
        Assert.NotEmpty(new FractalRequest { XMin = 5, XMax = 5 }.Validate());
        Assert.NotEmpty(new FractalRequest { Type = "unknown" }.Validate());
    }
}
