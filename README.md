# ItemHub — Plataforma de Troca/Doação (Protótipo)

Protótipo simples de marketplace para doar/vender/se livrar de itens. Desenvolvido em menos de 1 mês. Tudo foi self-hosted e mantido em localhost durante o desenvolvimento.

Principais arquivos e símbolos
- Backend arquivo principal:
  [backend/app.py](backend/app.py)  
- Modelos:
  [`User`](backend/models.py),
  [`Item`](backend/models.py),
  [`ItemImage`](backend/models.py),
  [`Offer`](backend/models.py)
- Rotas:
  - Autenticação: [backend/routes/auth_routes.py](backend/routes/auth_routes.py)
  - Items: [backend/routes/item_routes.py](backend/routes/item_routes.py)
  - Offers: [backend/routes/offer_routes.py](backend/routes/offer_routes.py)
  - Locations: [backend/routes/location_routes.py](backend/routes/location_routes.py)
- Config & upload: [backend/config.py](backend/config.py)
- Infra/Docker: [backend/Dockerfile](backend/Dockerfile), [backend/docker-compose.yml](backend/docker-compose.yml)
- Frontend (páginas principais): [frontend/index.html](frontend/index.html), [frontend/myItems.html](frontend/myItems.html), [frontend/login.html](frontend/login.html), [frontend/register.html](frontend/register.html), [frontend/itemDetails.html](frontend/itemDetails.html), [frontend/marketplace.html](frontend/marketplace.html), [frontend/dashboard.html](frontend/dashboard.html)  



Stack tecnológico
- Backend: Python, Flask + Flask-JWT-Extended, SQLAlchemy, Gunicorn
- Banco de dados: PostgreSQL (via Docker)
- Frontend: Vanilla JS, HTML, CSS, Bootstrap
- Infra: Docker, nginx
- Uploads: diretório local `uploads/` (configurado em [backend/config.py](backend/config.py))

O que está implementado
- Versão protótipo com ~23 endpoints organizados em blueprints para auth, items, offers e locations.  
- CRUD funcional para Items e Offers (criação, leitura, atualização, cancelamento/confirmação parcial). Consulte as implementações em [backend/routes/item_routes.py](backend/routes/item_routes.py) e [backend/routes/offer_routes.py](backend/routes/offer_routes.py).  
- Listagem paginada e filtros (categorias, estados, cidades, busca de texto) implementados no endpoint de items.  
- Upload de imagens suportado (serve via rota de imagens em [backend/routes/item_routes.py](backend/routes/item_routes.py)).  
- Dashboard/fluxos de propostas integrados no frontend (modais reutilizáveis em [frontend/js/components/offersModals.js](frontend/js/components/offersModals.js)).

Páginas funcionais (frontend)
- index — [frontend/index.html](frontend/index.html)  
- myItems — [frontend/myItems.html](frontend/myItems.html)  
- login — [frontend/login.html](frontend/login.html)  
- register — [frontend/register.html](frontend/register.html)  
- itemDetails — [frontend/itemDetails.html](frontend/itemDetails.html)  
- marketplace — [frontend/marketplace.html](frontend/marketplace.html)
- dashboard — [frontend/dashboard.html](frontend/dashboard.html)  

Observações / Limitações
- A página de perfil está inteiramente mockada (não persiste alterações): [frontend/profile.html](frontend/profile.html).  
- Sistema de notificações também está mockado/no-ops.  
- Fluxo de conclusão/enceramento de ofertas (workflow completo entre comprador/vendedor) ficou fora do escopo do protótipo por limitação de tempo — há endpoints de confirmação/declínio em [backend/routes/offer_routes.py](backend/routes/offer_routes.py), mas o fluxo completo pode necessitar de ajustes para produção.  
- Nenhum teste automatizado foi incluído até o momento.
- Nenhuma validação sistematica de parametros no backend
- Ainda sem cache no backend



Como rodar localmente
1. Instale o Docker (e Docker Compose).  
2. Clone / baixe o repositório e abra um terminal na raiz do projeto.  
3. Entre na pasta do backend:
   ```sh
   cd backend
   ```
4. Suba os containers:
   ```sh
   docker compose up --build
   ```
   - O compose cria o serviço do banco (Postgres), o backend (Flask/Gunicorn) e serve o frontend via nginx conforme configuração.


Notas de desenvolvimento

- Uploads são armazenados em uploads (mapeado no docker-compose.yml).
- Configurações de ambiente estão em .env e parte delas é carregada por config.py.
- O servidor no container backend usa Gunicorn conforme Dockerfile.

Contato / créditos
- Projeto feito em menos de 1 mês.
- Autoria de: Vinicius barros canonico
- contatos: www.linkedin.com/in/vinícius-canônico - viniciusbcanonico@gmail.com


