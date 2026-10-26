ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS provider
WORKDIR /app
COPY security.mjs clamd.mjs provider.mjs ./
USER 10001:10001
CMD ["node","provider.mjs"]

FROM ${NODE_IMAGE} AS processor
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ghostscript && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY security.mjs worker.mjs ./
USER 10001:10001
CMD ["node","worker.mjs"]
