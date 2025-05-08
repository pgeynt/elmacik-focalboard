# ─── Webapp build stage ─────────────────────────────────────────────────────────
FROM node:16.3.0@sha256:ca6daf1543242acb0ca59ff425509eab7defb9452f6ae07c156893db06c7a9a4 AS nodebuild

WORKDIR /webapp
ADD webapp/ /webapp

# Workaround for optipng-bin ARM Neon bug (can be removed once 
# https://github.com/imagemin/optipng-bin/issues/118 is fixed)
RUN CPPFLAGS="-DPNG_ARM_NEON_OPT=0" \
    npm install --no-optional \
 && npm run pack

# ─── Go build stage ─────────────────────────────────────────────────────────────
FROM golang:1.22 AS gobuild

WORKDIR /go/src/focalboard
ADD . /go/src/focalboard

# Allow cross-compile into a Docker-ready server binary
ARG TARGETOS
ARG TARGETARCH
RUN EXCLUDE_PLUGIN=true \
    EXCLUDE_SERVER=true \
    EXCLUDE_ENTERPRISE=true \
    make server-docker os=${TARGETOS} arch=${TARGETARCH}

# ─── Final runtime image ────────────────────────────────────────────────────────
# Önceki buster-slim -> bookworm-slim olarak güncelledik
FROM debian:bookworm-slim

# Prepare directories & permissions
RUN mkdir -p /opt/focalboard/data/files \
 && chown -R nobody:nogroup /opt/focalboard

WORKDIR /opt/focalboard

# Copy built assets & binaries
COPY --from=nodebuild --chown=nobody:nogroup /webapp/pack       pack/
COPY --from=gobuild  --chown=nobody:nogroup /go/src/focalboard/bin/docker/focalboard-server bin/
COPY --from=gobuild  --chown=nobody:nogroup /go/src/focalboard/LICENSE.txt           LICENSE.txt
COPY --from=gobuild  --chown=nobody:nogroup /go/src/focalboard/docker/server_config.json config.json

USER nobody

EXPOSE 8000/tcp 9092/tcp

VOLUME ["/opt/focalboard/data"]

CMD ["bin/focalboard-server"]
