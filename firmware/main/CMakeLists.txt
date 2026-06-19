idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES mbedtls esp_http_client esp_wifi nvs_flash app_update json)
