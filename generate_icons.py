from PIL import Image, ImageDraw, ImageFont
import os


def create_icon(size, output_path):
    # Create a new image with a purple background
    img = Image.new("RGB", (size, size), "#6c5ce7")
    draw = ImageDraw.Draw(img)

    # Draw a simple "T" in white
    font_size = int(size * 0.6)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "T"
    text_width = draw.textlength(text, font=font)
    text_height = font_size

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill="white", font=font)

    # Save the image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)


# Generate icons for different sizes
sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for size in sizes:
    output_path = f"static/icons/icon-{size}x{size}.png"
    create_icon(size, output_path)

print("Icons generated successfully!")
