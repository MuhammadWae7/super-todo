# Development Tools

This directory contains utility scripts for development and maintenance.

## Icon Generation Scripts

### Prerequisites
```bash
pip install Pillow
```

### generate_icons.py
Generates PWA icons in multiple sizes for different devices and screen resolutions.
```bash
python generate_icons.py
```

### generate_favicon.py
Generates favicon.ico and favicon.png for browser tabs.
```bash
python generate_favicon.py
```

The generated icons will be placed in the `static/icons` directory. 