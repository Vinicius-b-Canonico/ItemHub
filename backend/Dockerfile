FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create uploads folder
RUN mkdir -p uploads

# Expose Flask port
EXPOSE 5000

# Run with Gunicorn (more robust than flask run)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:create_app()"]
