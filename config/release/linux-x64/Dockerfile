# Review candidate only: the caller must resolve this argument to a registry digest.
ARG NODE_RUNTIME_IMAGE
FROM ${NODE_RUNTIME_IMAGE}
WORKDIR /opt/manaratak
COPY --chown=node:node api-runtime/ ./
COPY release-tools/ /opt/release-tools/
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/server.cjs"]
