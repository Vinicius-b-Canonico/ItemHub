# commands.py
import click
from app import create_app
from models import db
from seed import seed_database

@click.command()
def seed():
    """Popula o banco com dados mock se estiver vazio."""
    print("got inside seed func")

    app = create_app()
    print("Rodando seed...")
    seed_database(app)
    print("Seed concluído!")

# Registra o comando
def init_app(app):
    app.cli.add_command(seed)