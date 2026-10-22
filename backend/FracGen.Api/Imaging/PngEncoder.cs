using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace FracGen.Api.Imaging;

/// <summary>
/// Small dependency-free RGBA PNG encoder. Avoids System.Drawing's Windows-only limitations.
/// </summary>
public static class PngEncoder
{
    private static readonly byte[] Signature = [137, 80, 78, 71, 13, 10, 26, 10];
    private static readonly uint[] CrcTable = BuildCrcTable();

    public static byte[] Encode(int width, int height, ReadOnlySpan<byte> rgba)
    {
        if (width <= 0 || height <= 0 || rgba.Length != checked(width * height * 4))
            throw new ArgumentException("Invalid image dimensions or RGBA buffer.");

        using var output = new MemoryStream();
        output.Write(Signature);
        Span<byte> ihdr = stackalloc byte[13];
        ihdr.Clear(); // PNG requires compression, filter and interlace flags to be zero.
        BinaryPrimitives.WriteInt32BigEndian(ihdr[..4], width);
        BinaryPrimitives.WriteInt32BigEndian(ihdr.Slice(4, 4), height);
        ihdr[8] = 8; // 8-bit depth
        ihdr[9] = 6; // RGBA
        WriteChunk(output, "IHDR", ihdr);

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Fastest, leaveOpen: true))
        {
            var stride = checked(width * 4);
            Span<byte> filter = stackalloc byte[1]; // PNG filter type 0 (none)
            filter[0] = 0;
            for (var row = 0; row < height; row++)
            {
                zlib.Write(filter);
                zlib.Write(rgba.Slice(row * stride, stride));
            }
        }
        WriteChunk(output, "IDAT", compressed.ToArray());
        WriteChunk(output, "IEND", ReadOnlySpan<byte>.Empty);
        return output.ToArray();
    }

    private static void WriteChunk(Stream output, string name, ReadOnlySpan<byte> data)
    {
        Span<byte> header = stackalloc byte[8];
        BinaryPrimitives.WriteInt32BigEndian(header[..4], data.Length);
        Encoding.ASCII.GetBytes(name.AsSpan(), header[4..]);
        output.Write(header);
        output.Write(data);

        uint crc = 0xffffffff;
        foreach (var b in header[4..]) crc = (crc >> 8) ^ CrcTable[(int)((crc ^ b) & 255)];
        foreach (var b in data) crc = (crc >> 8) ^ CrcTable[(int)((crc ^ b) & 255)];
        Span<byte> crcBytes = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(crcBytes, crc ^ 0xffffffff);
        output.Write(crcBytes);
    }

    private static uint[] BuildCrcTable()
    {
        var table = new uint[256];
        for (uint n = 0; n < 256; n++)
        {
            uint c = n;
            for (var k = 0; k < 8; k++)
                c = (c & 1) != 0 ? 0xedb88320 ^ (c >> 1) : c >> 1;
            table[(int)n] = c;
        }
        return table;
    }
}
