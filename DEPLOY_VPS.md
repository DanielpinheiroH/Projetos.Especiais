# Deploy do backend na VPS

Esta configuração publica apenas a API na VPS. O frontend continua na Vercel e
acessa a API por `https://projetos-especiais.duckdns.org/api`.

## Pré-requisitos

- Uma VPS Ubuntu/Debian com Docker Engine, Docker Compose e Nginx.
- Portas TCP 22, 80 e 443 liberadas; UDP 443 é recomendada para HTTP/3.
- Um domínio ou subdomínio com registro A apontando para o IP da VPS.
- A credencial do Google Cloud Storage usada pelo backend.

A credencial do Google Cloud deve ficar em
`backend/secrets/gcs-service-account.json`, com permissão `600`. O Compose a
monta no container como arquivo somente leitura, seguindo o mesmo padrão do
`sistema-veiculacoes`.

Como a imagem executa o backend com o usuário `node` (UID/GID 1000), ajuste a
propriedade da credencial antes de subir o container:

```bash
sudo chown 1000:1000 backend/secrets/gcs-service-account.json
sudo chmod 600 backend/secrets/gcs-service-account.json
```

## Primeira publicação

```bash
sudo mkdir -p /opt/projetos-especiais
sudo chown "$USER":"$USER" /opt/projetos-especiais
git clone https://github.com/DanielpinheiroH/Projetos.Especiais.git \
  /opt/projetos-especiais
cd /opt/projetos-especiais
mkdir -p backups
chmod 700 backups
cp .env.vps.example .env.vps
nano .env.vps
# Com um backup antigo, siga primeiro a seção "Restaurar o banco antigo".
docker compose --env-file .env.vps -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.vps -f docker-compose.prod.yml ps
curl http://127.0.0.1:3334/api/health
```

O backend fica acessível somente no loopback da VPS. Ele não ocupa diretamente
as portas 80/443 e não interfere nos demais projetos.

## Nginx e certificado HTTPS

```bash
sudo cp deploy/nginx-projetos-especiais.conf \
  /etc/nginx/sites-available/projetos-especiais
sudo ln -s /etc/nginx/sites-available/projetos-especiais \
  /etc/nginx/sites-enabled/projetos-especiais
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d projetos-especiais.duckdns.org
curl https://projetos-especiais.duckdns.org/api/health
```

Antes de subir o Compose, confirme com `sudo ss -ltnp` que a porta local 3334
está livre. Se precisar trocar, altere `BACKEND_PORT` no `.env.vps` e a porta do
`proxy_pass` na configuração do Nginx.

## Atualizações

```bash
git pull --ff-only
docker compose --env-file .env.vps -f docker-compose.prod.yml up -d --build
docker image prune -f
```

## Restaurar o banco antigo

O arquivo `projetos_especiais.dump` é um backup PostgreSQL no formato custom.
Na primeira publicação, envie-o para `/opt/projetos-especiais/backups` na VPS e
suba somente o PostgreSQL:

```bash
docker compose --env-file .env.vps -f docker-compose.prod.yml up -d postgres
docker compose --env-file .env.vps -f docker-compose.prod.yml ps
```

Em um banco novo e vazio, restaure o backup antes de iniciar o backend:

```bash
docker compose --env-file .env.vps -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  < backups/projetos_especiais.dump
```

O parâmetro `--clean` remove objetos existentes no banco de destino. Use esse
comando somente durante a migração inicial ou depois de gerar um backup do
banco da VPS.

Após a restauração, inicie a aplicação completa:

```bash
docker compose --env-file .env.vps -f docker-compose.prod.yml up -d --build
curl https://projetos-especiais.duckdns.org/api/health
```

## Frontend na Vercel

Defina a variável de ambiente de produção:

```text
VITE_API_URL=https://projetos-especiais.duckdns.org/api
```

Depois faça um novo deploy do frontend. `CORS_ORIGIN`, no `.env.vps`, deve ser
`https://projetosespeciais.vercel.app`, sem barra no final.

Não configure `VITE_API_URL` somente com o hostname: a URL de produção completa
inclui obrigatoriamente `https://` e o prefixo `/api`.

## Logs e diagnóstico

```bash
docker compose --env-file .env.vps -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.vps -f docker-compose.prod.yml ps
```

## Backup do PostgreSQL

```bash
docker compose --env-file .env.vps -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U projetos_app -d projetos_especiais -Fc > backup.dump
```

O arquivo `.env.vps` contém segredos e nunca deve ser enviado ao Git.
