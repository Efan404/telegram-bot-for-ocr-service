FROM denoland/deno:alpine-1.45.0

WORKDIR /app

COPY supabase/functions/tg-test-bots-menu/index.ts ./index.ts

RUN deno cache --reload ./index.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "index.ts"]
