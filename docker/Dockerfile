FROM node:22-alpine

WORKDIR /app

COPY serve.js .
COPY kanban.html .
COPY favicon.svg .

RUN mkdir -p /data

ENV KANBAN_DATA_FILE=/data/kanban-board.json
ENV KANBAN_PORT=5555

EXPOSE 5555

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5555/health || exit 1

CMD ["node", "serve.js"]
