import os
from werkzeug.utils import secure_filename
from datetime import datetime


def save_uploaded_image(file_storage, upload_folder: str) -> str:
    """
    Salva a imagem exatamente como foi enviada pelo usuário.
    - Não redimensiona
    - Não faz padding
    - Não converte formato (mantém o original)
    - Apenas gera um nome seguro e único
    - Retorna o nome do arquivo salvo (para guardar no banco)

    Mantém total compatibilidade com todo o código antigo que já chama essa função.
    """
    os.makedirs(upload_folder, exist_ok=True)

    # Gera nome único e seguro: timestamp + nome original sanitizado
    timestamp = datetime.utcnow().timestamp()
    safe_original_name = secure_filename(file_storage.filename)
    filename = f"{timestamp}_{safe_original_name}"

    save_path = os.path.join(upload_folder, filename)

    # Salva exatamente como veio (mantém formato, qualidade, metadados etc.)
    file_storage.save(save_path)

    return filename