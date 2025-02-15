from PIL import Image, ImageDraw, ImageFont
import os

def create_favicon():
    # Create a 32x32 image (standard favicon size)
    size = 32
    img = Image.new('RGBA', (size, size), (108, 92, 231, 255))  # Using our primary color #6c5ce7
    draw = ImageDraw.Draw(img)
    
    # Create rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=8, fill=255)
    
    # Apply the mask
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, mask=mask)
    
    # Add a checkmark
    draw = ImageDraw.Draw(output)
    check_points = [
        (8, 16),    # Start
        (14, 22),   # Middle point
        (24, 10)    # End
    ]
    draw.line(check_points, fill='white', width=3)
    
    # Ensure the static directory exists
    os.makedirs('static', exist_ok=True)
    
    # Save as both ICO and PNG
    output.save('static/favicon.ico', format='ICO', sizes=[(32, 32)])
    output.save('static/favicon.png', format='PNG')

if __name__ == '__main__':
    create_favicon() 