.PHONY: prebuild clean cleanall ci server server-linux-package generate watch-server webapp modd-precheck templates-archive

PACKAGE_FOLDER = focalboard

# Build Flags
BUILD_NUMBER ?= $(BUILD_NUMBER:)
BUILD_DATE = $(shell date -u)
BUILD_HASH = $(shell git rev-parse HEAD)
# If we don't set the build number it defaults to dev
ifeq ($(BUILD_NUMBER),)
	BUILD_NUMBER := dev
	BUILD_DATE := n/a
endif

BUILD_TAGS += json1 sqlite3

LDFLAGS += -X "github.com/mattermost/focalboard/server/model.BuildNumber=$(BUILD_NUMBER)"
LDFLAGS += -X "github.com/mattermost/focalboard/server/model.BuildDate=$(BUILD_DATE)"
LDFLAGS += -X "github.com/mattermost/focalboard/server/model.BuildHash=$(BUILD_HASH)"

RACE = -race

ifeq ($(OS),Windows_NT)
	RACE := ''
endif

# MAC cpu architecture
ifeq ($(shell uname -m),arm64)
	MAC_GO_ARCH := arm64
else
	MAC_GO_ARCH := amd64
endif

all: webapp server ## Build server and webapp.

prebuild: ## Run prebuild actions (install dependencies etc.).
	cd webapp; npm install

ci: webapp-ci server-test ## Simulate CI, locally.

templates-archive: ## Build templates archive file
	cd server/assets/build-template-archive; go run -tags '$(BUILD_TAGS)' main.go --dir="../templates-boardarchive" --out="../templates.boardarchive"

server: ## Build server for local environment.
	$(eval LDFLAGS += -X "github.com/mattermost/focalboard/server/model.Edition=dev")
	cd server; go build -ldflags '$(LDFLAGS)' -tags '$(BUILD_TAGS)' -o ../bin/focalboard-server ./main

server-docker: ## Build server for Docker Architectures.
	mkdir -p bin/docker
	$(eval LDFLAGS += -X "github.com/mattermost/focalboard/server/model.Edition=linux")
	cd server; env GOOS=$(os) GOARCH=$(arch) go build -ldflags '$(LDFLAGS)' -tags '$(BUILD_TAGS)' -o ../bin/docker/focalboard-server ./main

server-linux-package: server webapp
	rm -rf package
	mkdir -p package/${PACKAGE_FOLDER}/bin
	cp bin/focalboard-server package/${PACKAGE_FOLDER}/bin
	cp -R webapp/pack package/${PACKAGE_FOLDER}/pack
	cp server-config.json package/${PACKAGE_FOLDER}/config.json
	cp NOTICE.txt package/${PACKAGE_FOLDER}
	cp webapp/NOTICE.txt package/${PACKAGE_FOLDER}/webapp-NOTICE.txt
	mkdir -p dist
	cd package && tar -czvf ../dist/focalboard-server-linux-amd64.tar.gz ${PACKAGE_FOLDER}
	rm -rf package

server-linux-package-docker:
	rm -rf package
	mkdir -p package/${PACKAGE_FOLDER}/bin
	cp bin/docker/focalboard-server package/${PACKAGE_FOLDER}/bin
	cp -R webapp/pack package/${PACKAGE_FOLDER}/pack
	cp server-config.json package/${PACKAGE_FOLDER}/config.json
	cp NOTICE.txt package/${PACKAGE_FOLDER}
	cp webapp/NOTICE.txt package/${PACKAGE_FOLDER}/webapp-NOTICE.txt
	mkdir -p dist
	cd package && tar -czvf ../dist/focalboard-server-linux-$(arch).tar.gz ${PACKAGE_FOLDER}
	rm -rf package

generate: ## Install and run code generators.
	cd server; go install github.com/golang/mock/mockgen@v1.6.0
	cd server; go generate ./...

server-lint: ## Run linters on server code.
	@if ! [ -x "$$(command -v golangci-lint)" ]; then \
		echo "golangci-lint is not installed. Please see https://github.com/golangci/golangci-lint#install-golangci-lint for installation instructions."; \
		exit 1; \
	fi;
	cd server; golangci-lint run ./...

modd-precheck:
	@if ! [ -x "$$(command -v modd)" ]; then \
		echo "modd is not installed. Please see https://github.com/cortesi/modd#install for installation instructions"; \
		exit 1; \
	fi; \

watch: modd-precheck ## Run both server and webapp watching for changes
	env FOCALBOARD_BUILD_TAGS='$(BUILD_TAGS)' modd

watch-single-user: modd-precheck ## Run both server and webapp in single user mode watching for changes
	env FOCALBOARDSERVER_ARGS=--single-user FOCALBOARD_BUILD_TAGS='$(BUILD_TAGS)' modd

watch-server-test: modd-precheck ## Run server tests watching for changes
	env FOCALBOARD_BUILD_TAGS='$(BUILD_TAGS)' modd -f modd-servertest.conf

server-test: server-test-sqlite server-test-mysql server-test-mariadb server-test-postgres ## Run server tests

server-test-sqlite: export FOCALBOARD_UNIT_TESTING=1

server-test-sqlite: ## Run server tests using sqlite
	cd server; go test -tags '$(BUILD_TAGS)' -race -v -coverpkg=./... -coverprofile=server-sqlite-profile.coverage -count=1 -timeout=30m ./...
	cd server; go tool cover -func server-sqlite-profile.coverage

server-test-mini-sqlite: export FOCALBOARD_UNIT_TESTING=1

server-test-mini-sqlite: ## Run server tests using sqlite
	cd server/integrationtests; go test -tags '$(BUILD_TAGS)' $(RACE) -v -count=1 -timeout=30m ./...

server-test-mysql: export FOCALBOARD_UNIT_TESTING=1
server-test-mysql: export FOCALBOARD_STORE_TEST_DB_TYPE=mysql
server-test-mysql: export FOCALBOARD_STORE_TEST_DOCKER_PORT=44446

server-test-mysql: ## Run server tests using mysql
	@echo Starting docker container for mysql
	docker compose -f ./docker-testing/docker-compose-mysql.yml down -v --remove-orphans
	docker compose -f ./docker-testing/docker-compose-mysql.yml run start_dependencies
	cd server; go test -tags '$(BUILD_TAGS)' -race -v -coverpkg=./... -coverprofile=server-mysql-profile.coverage -count=1 -timeout=30m ./...
	cd server; go tool cover -func server-mysql-profile.coverage
	docker compose -f ./docker-testing/docker-compose-mysql.yml down -v --remove-orphans

server-test-mariadb: export FOCALBOARD_UNIT_TESTING=1
server-test-mariadb: export FOCALBOARD_STORE_TEST_DB_TYPE=mariadb
server-test-mariadb: export FOCALBOARD_STORE_TEST_DOCKER_PORT=44445

server-test-mariadb: templates-archive ## Run server tests using mysql
	@echo Starting docker container for mariadb
	docker compose -f ./docker-testing/docker-compose-mariadb.yml down -v --remove-orphans
	docker compose -f ./docker-testing/docker-compose-mariadb.yml run start_dependencies
	cd server; go test -tags '$(BUILD_TAGS)' -race -v -coverpkg=./... -coverprofile=server-mariadb-profile.coverage -count=1 -timeout=30m ./...
	cd server; go tool cover -func server-mariadb-profile.coverage
	docker compose -f ./docker-testing/docker-compose-mariadb.yml down -v --remove-orphans

server-test-postgres: export FOCALBOARD_UNIT_TESTING=1
server-test-postgres: export FOCALBOARD_STORE_TEST_DB_TYPE=postgres
server-test-postgres: export FOCALBOARD_STORE_TEST_DOCKER_PORT=44447

server-test-postgres: ## Run server tests using postgres
	@echo Starting docker container for postgres
	docker compose -f ./docker-testing/docker-compose-postgres.yml down -v --remove-orphans
	docker compose -f ./docker-testing/docker-compose-postgres.yml run start_dependencies
	cd server; go test -tags '$(BUILD_TAGS)' -race -v -coverpkg=./... -coverprofile=server-postgres-profile.coverage -count=1 -timeout=30m ./...
	cd server; go tool cover -func server-postgres-profile.coverage
	docker compose -f ./docker-testing/docker-compose-postgres.yml down -v --remove-orphans

webapp: ## Build webapp.
	cd webapp; npm run pack

webapp-ci: ## Webapp CI: linting & testing.
	cd webapp; npm run check
	cd webapp; npm run test
	cd webapp; npm run cypress:ci

webapp-test: ## jest tests for webapp
	cd webapp; npm run test

clean: ## Clean build artifacts.
	rm -rf bin
	rm -rf dist
	rm -rf webapp/pack

cleanall: clean ## Clean all build artifacts and dependencies.
	rm -rf webapp/node_modules

## Help documentatin à la https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' ./Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
