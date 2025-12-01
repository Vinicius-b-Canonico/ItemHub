# ============================================
# ============= SEED FINAL - PRONTO PRA APRESENTAÇÃO ===========
# ============================================
import os
import random
from datetime import datetime, timedelta

from psycopg2 import OperationalError, ProgrammingError
from app import create_app, db
from models import User, Item, ItemImage, Offer
from werkzeug.security import generate_password_hash



print("[SEED] Iniciando seed.py atualizado (com usuário fixo + imagens coerentes)")

# ========================
# DADOS MOCK REALISTAS
# ========================
FIRST_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João"]
LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Lima", "Ferreira", "Almeida", "Ribeiro"]

CATEGORIES = [
        "Eletrônicos",
        "Informática",
        "Celulares e Acessórios",
        "Games",
        "Eletrodomésticos",
        "Móveis",
        "Decoração",
        "Roupas",
        "Calçados",
        "Acessórios de Moda",
        "Esporte e Lazer",
        "Livros",
        "Papelaria",
        "Ferramentas",
        "Construção",
        "Automotivo",
        "Bebês e Infantil",
        "Brinquedos",
        "Pet Shop",
        "Saúde e Beleza",
        "Perfumaria",
        "Cozinha",
        "Alimentos e Bebidas",
        "Jardinagem",
        "Colecionáveis",
        "Instrumentos Musicais",
        "Arte e Artesanato",
        "Fotografia",
        "Som e Áudio",
        "Filmes e Séries",
        "Casa Inteligente",
        "Camping e Aventura",
        "Relógios",
        "Joias",
        "Puzzles e Board Games",
        "Papelaria e Escritório",
        "Outros"
    ]



VALID_LOCATIONS = {
    "São Paulo": ["São Paulo", "Campinas", "Santos", "Guarulhos", "Sorocaba", "Ribeirão Preto"],
    "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu"],
    "Minas Gerais": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora"],
    "Bahia": ["Salvador", "Feira de Santana", "Vitória da Conquista"],
    "Paraná": ["Curitiba", "Londrina", "Maringá"],
    "Rio Grande do Sul": ["Porto Alegre", "Caxias do Sul", "Pelotas"],
    "Santa Catarina": ["Florianópolis", "Joinville", "Blumenau"],
}

# IMAGENS DISPONÍVEIS (devem existir na pasta uploads)
ALL_IMAGES = [
    "sofa-cinza.jpg", "geladeira-inox.jpg", "tv-55-oled.jpg", "bicicleta-caloi.jpg",
    "iphone-13.jpg", "notebook-gamer.jpg", "cama-casal.jpg", "mesa-jantar.jpg",
    "ps5.jpg", "fritadeira.jpg"
]

# MAPEAMENTO EXATO: título contém → imagem principal (100% coerente)
TITLE_TO_IMAGE = {
    "sofá": "sofa-cinza.jpg",
    "geladeira": "geladeira-inox.jpg",
    "tv": "tv-55-oled.jpg",
    "bicicleta": "bicicleta-caloi.jpg",
    "iphone": "iphone-13.jpg",
    "macbook": "notebook-gamer.jpg",
    "ps5": "ps5.jpg",
    "cama": "cama-casal.jpg",
    "fritadeira": "fritadeira.jpg",
    "mesa": "mesa-jantar.jpg",
    "canon": "camera-canon.jpg",
    "guarda-roupa": "guarda-roupa.jpg",
    "entulho": "pilha-entulho.jpg",
}

VALID_DURATIONS = [1, 7, 15, 30]

# TÍTULOS COM PALAVRAS-CHAVE CLARAS
TITLES = {
    "free": [
        "Sofá 3 lugares - de graça!", "Geladeira funcionando", "TV 50\" LED pra levar",
        "Cama box casal", "Guarda-roupa 6 portas", "Mesa de jantar com 6 cadeiras"
    ],
    "pay": [
        "iPhone 13 128GB - semi-novo", "MacBook Air M1", "PS5 + 2 controles",
        "Bicicleta Caloi aro 29", "Fritadeira Airfryer 5L", "Câmera Canon T7i"
    ],
    "paid_to_take": [
        "Pago pra levarem entulho", "Levem sofá velho", "geladeira quebrada"
    ]
}

def seed_database(app):
    print("Entrou em seed_database()")
    with app.app_context():
        print("Dentro do app context")

        # Verifica se já tem dados
        try:
            if Item.query.first() or User.query.first():
                print("Banco já possui dados. Seed cancelado.")
                return
        except (OperationalError, ProgrammingError):
            # Isso acontece quando as tabelas ainda não existem
            print("Tabelas ainda não existem — seed deve parar por enquanto.")
            return
            
        print("Iniciando seed com usuário fixo e imagens coerentes...")

        # ====================
        # 1. USUÁRIO FIXO DE TESTE
        # ====================
        print("Criando usuário fixo de teste...")
        user_teste = User(
            username="teste",
            email="teste@teste.com",
            full_name="Usuário de Teste",
            password_hash=generate_password_hash("123456")
        )
        db.session.add(user_teste)
        db.session.flush()  # pra garantir o ID
        print("→ Usuário 'teste' criado: teste@teste.com / senha: 123456")

        # ====================
        # 2. DEMAIS USUÁRIOS
        # ====================
        users = [user_teste]
        usernames_used = {"teste"}

        for i in range(11):  # +11 = total 12
            while True:
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                suffix = f"{random.randint(10, 99)}" if random.random() > 0.3 else ""
                username = f"{first.lower()}_{last.lower()}{suffix}"
                if username not in usernames_used:
                    usernames_used.add(username)
                    break
            full_name = f"{first} {last}"
            email = f"{username}@exemplo.com"
            user = User(username=username, email=email, full_name=full_name,
                        password_hash=generate_password_hash("123456"))
            db.session.add(user)
            users.append(user)

        db.session.commit()
        print(f"Total de {len(users)} usuários criados (incluindo 'teste')")

        # ====================
        # 3. ITENS COM IMAGENS COERENTES
        # ====================
        items = []
        for i in range(40):
            owner = random.choice(users)
            state = random.choice(list(VALID_LOCATIONS.keys()))
            city = random.choice(VALID_LOCATIONS[state])
            offer_type = random.choices(["free", "pay", "paid_to_take"], weights=[45, 35, 20])[0]
            base_title = random.choice(TITLES[offer_type])
            title = f"{base_title} #{i+1:02d}"

            # ESCOLHA DA IMAGEM PRINCIPAL (100% coerente)
            chosen_image = None
            title_lower = title.lower()
            for keyword, img in TITLE_TO_IMAGE.items():
                if keyword in title_lower:
                    chosen_image = img
                    break
            if not chosen_image:
                chosen_image = random.choice(ALL_IMAGES)  # fallback

            item = Item(
                owner=owner,
                owner_username=owner.username,
                title=title,
                description="Item em bom estado. Retirar o mais rápido possível. Contato via chat.",
                category=random.choice(CATEGORIES),
                offer_type=offer_type,
                volume=round(random.uniform(0.2, 8.0), 2),
                state=state,
                city=city,
                address=f"Rua Exemplo {random.randint(50, 999)}, Centro, {city} - {state}",
                duration_days=random.choice(VALID_DURATIONS),
                status="ativo",
                created_at=datetime.now()# - timedelta(days=random.randint(0, 55))
            )
            db.session.add(item)
            items.append(item)

        db.session.flush()

        # Adiciona imagens
        for item in items:
            title_lower = item.title.lower()
            main_img = None
            for kw, img in TITLE_TO_IMAGE.items():
                if kw in title_lower:
                    main_img = img
                    break
            if not main_img:
                main_img = random.choice(ALL_IMAGES)

            item.image_url = f"/items/image/{main_img}"

            num_imgs = random.randint(2, 5)
            extra_imgs = [main_img] + random.choices(ALL_IMAGES, k=num_imgs-1)
            for pos, img_name in enumerate(extra_imgs):
                db.session.add(ItemImage(
                    item_id=item.id,
                    image_url=f"/items/image/{img_name}",
                    position=pos,
                    enabled=True
                ))

        db.session.commit()
        print(f"{len(items)} itens criados com imagens 100% coerentes!")

        # --------------------
        # 4. Criar ofertas 
        # --------------------
        print("[DEBUG] Início da criação de ofertas")
        offers_created = 0
        for attempt in range(2000):
            print(f"[DEBUG] Tentativa de criar oferta {attempt+1}/2000 (atualmente {offers_created}/50 criadas)")

            if offers_created >= 50:
                print("[DEBUG] Limite de 50 ofertas alcançado.")
                break

            item = random.choice(items)
            print(f"[DEBUG] item escolhido ID={item.id}, status={item.status}")

            if item.status != "ativo":
                print("[DEBUG] Item não ativo. Ignorando.")
                continue

            if item.is_expired():
                print("[DEBUG] Item expirado. Ignorando.")
                continue

            possible_bidders = [u for u in users if u.id != item.owner_id]
            print(f"[DEBUG] Total possible bidders: {len(possible_bidders)}")

            if not possible_bidders:
                print("[DEBUG] Nenhum bidder possível. Pulando.")
                continue

            bidder = random.choice(possible_bidders)
            print(f"[DEBUG] Bidder selecionado: {bidder.username}")

            existing = Offer.find_valid_user_offer_for_item(bidder.id, item.id)
            print(f"[DEBUG] existing_offer = {existing}")

            if existing:
                print("[DEBUG] Usuário já fez oferta válida neste item. Pulando.")
                continue

            # Determinar preço
            if item.offer_type == "free":
                price = 0.0
            elif item.offer_type == "pay":
                price = round(random.uniform(80, 1800), 2)
            else:
                price = round(random.uniform(-400, -50), 2)

            print(f"[DEBUG] price definido: {price}")

            messages = [
                "Tenho interesse! Posso buscar amanhã?",
                "Ainda está disponível?",
                "Aceita R$ {:.0f} à vista?".format(price) if price > 0 else "Posso levar hoje?",
                "Posso passar aí sábado?",
                "Reservado pra mim?",
                "Funciona tudo direitinho?",
            ]

            msg = random.choice(messages)
            print(f"[DEBUG] Mensagem escolhida: {msg}")

            created_time = datetime.now() - timedelta(days=random.randint(0, 10))

            offer = Offer(
                user_id=bidder.id,
                user_name=bidder.username,
                item_id=item.id,
                price=price,
                message=msg,
                status="ativo",
                created_at=created_time
            )
            print(f"[DEBUG] Criando Offer user={bidder.id}, item={item.id}, price={price}")

            db.session.add(offer)
            offers_created += 1

        print("[DEBUG] Commit das ofertas...")
        db.session.commit()

        print(f"{offers_created} ofertas criadas com sucesso")
        print("\nSEED CONCLUÍDO COM SUCESSO!")
        print("   Usuários, itens com fotos, ofertas ativas — tudo pronto!")
        print("   Login de teste: qualquer username + senha: 123456")
