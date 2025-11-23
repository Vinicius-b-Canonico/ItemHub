import io
import os
from PIL import Image
from werkzeug.utils import secure_filename
from datetime import datetime

# Define a standard image size for your platform
STANDARD_SIZE = (640, 360)   # 16:9 landscape, good for cards


def resize_and_pad(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    Resize proportionally and then pad the remaining space with white.
    Ensures the final image is exactly target_w × target_h.
    """
    # First, resize while maintaining aspect ratio
    img.thumbnail((target_w, target_h))

    # Create background
    new_img = Image.new("RGB", (target_w, target_h), (255, 255, 255))

    # Center the resized image
    offset = (
        (target_w - img.width) // 2,
        (target_h - img.height) // 2
    )
    new_img.paste(img, offset)
    return new_img


def process_uploaded_image(file_storage):
    """
    Takes a Werkzeug FileStorage, processes it into a standard size,
    returns a PIL Image ready to be saved.
    """
    img = Image.open(file_storage).convert("RGB")

    target_w, target_h = STANDARD_SIZE
    processed = resize_and_pad(img, target_w, target_h)

    return processed


def save_processed_image(file_storage, upload_folder: str):
    """
    - Processes the image
    - Generates a secure filename
    - Saves the processed file to disk
    - Returns the final filename
    """
    os.makedirs(upload_folder, exist_ok=True)

    # Create secure unique filename
    orig = file_storage.filename
    filename = secure_filename(f"{datetime.utcnow().timestamp()}_{orig}")
    save_path = os.path.join(upload_folder, filename)

    # Process + save
    processed_img = process_uploaded_image(file_storage)
    processed_img.save(save_path, format="JPEG", quality=85)

    return filename
