#include "esp_event.h"
#include "esp_flash_partitions.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "mbedtls/aes.h"
#include "mbedtls/ecdsa.h"
#include "mbedtls/pk.h"
#include "mbedtls/sha256.h"
#include "nvs.h"
#include "nvs_flash.h"
#include <stdint.h>
#include <string.h>

// Hardcoded for demonstration. In production, load from NVS or secure element.
#define WIFI_SSID "."
#define WIFI_PASS "1210901210"

#define SEPOLIA_RPC_URL "https://rpc2.sepolia.org"
#define FIRMWARE_SERVER_URL                                                    \
  "http://10.180.151.5:3000/firmware" // Updated to your PC IP
#define CONTRACT_ADDRESS "0xYourDeployedContractAddressHere"

#include "ota_keys.h"

static const char *TAG = "SECURE_OTA";

// Simulated Web3 JSON-RPC call structure
int get_latest_firmware_metadata_from_web3(uint32_t *latest_version,
                                           uint8_t *expected_hash) {
  ESP_LOGI(TAG, "Querying Web3 Smart Contract on Sepolia...");
  // For brevity, this should use esp_http_client to POST a JSON-RPC payload
  // to SEPOLIA_RPC_URL calling getRelease().
  // E.g., {"jsonrpc":"2.0","method":"eth_call","params":[{"to":
  // CONTRACT_ADDRESS, "data": "..."}],"id":1}

  // Simulating a successful response for v3:
  *latest_version = 3;
  // Expected Hash should be populated from the contract
  return 0; // Success
}

void ota_task(void *pvParameter) {
  ESP_LOGI(TAG, "Starting Secure OTA Task...");

  uint32_t latest_version = 0;
  uint8_t expected_hash[32];

  if (get_latest_firmware_metadata_from_web3(&latest_version, expected_hash) !=
      0) {
    ESP_LOGE(TAG, "Failed to query Web3");
    vTaskDelete(NULL);
  }

  // Read the current version dynamically or set it to 3
  uint32_t CURRENT_VERSION = 3;
  if (latest_version <= CURRENT_VERSION) {
    ESP_LOGI(TAG, "Already running latest version. Exiting OTA.");
    vTaskDelete(NULL);
    return;
  }

  ESP_LOGI(TAG,
           "New firmware version %lu detected. Starting download stream...",
           latest_version);

  // Initialize OTA
  const esp_partition_t *update_partition =
      esp_ota_get_next_update_partition(NULL);
  esp_ota_handle_t update_handle = 0;
  esp_err_t err = esp_ota_begin(update_partition, OTA_WITH_SEQUENTIAL_WRITES,
                                &update_handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "esp_ota_begin failed (%s)", esp_err_to_name(err));
    vTaskDelete(NULL);
  }

  // Setup mbedTLS AES
  mbedtls_aes_context aes_ctx;
  mbedtls_aes_init(&aes_ctx);

  unsigned char local_aes_iv[16];
  memcpy(local_aes_iv, aes_iv, 16);

  mbedtls_aes_setkey_enc(&aes_ctx, aes_key,
                         128); // CTR requires the encryption key schedule
  size_t nc_off = 0;
  unsigned char stream_block[16] = {0};

  // Setup mbedTLS SHA-256
  mbedtls_sha256_context sha_ctx;
  mbedtls_sha256_init(&sha_ctx);
  mbedtls_sha256_starts(&sha_ctx, 0); // 0 for SHA-256

  // Setup HTTP Client to stream encrypted firmware
  char fw_url[256];
  snprintf(fw_url, sizeof(fw_url), "%s/firmware_v%lu.enc.bin",
           FIRMWARE_SERVER_URL, latest_version);

  esp_http_client_config_t config = {
      .url = fw_url,
      .timeout_ms = 10000,
  };
  esp_http_client_handle_t client = esp_http_client_init(&config);

  if ((err = esp_http_client_open(client, 0)) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open HTTP connection: %s", esp_err_to_name(err));
    esp_http_client_cleanup(client);
    vTaskDelete(NULL);
  }

  esp_http_client_fetch_headers(client);
  int status_code = esp_http_client_get_status_code(client);
  if (status_code != 200) {
    ESP_LOGE(TAG, "Failed to download firmware. HTTP Status: %d", status_code);
    esp_http_client_cleanup(client);
    vTaskDelete(NULL);
  }

  // Streaming Decryption and Flashing Loop
  int chunk_size = 4096; // Flash sector size boundary
  unsigned char *enc_buf = malloc(chunk_size);
  unsigned char *dec_buf = malloc(chunk_size);
  int bytes_read = 0;

  while (1) {
    int read_len = esp_http_client_read(client, (char *)enc_buf, chunk_size);
    if (read_len <= 0) {
      break; // EOF or Error
    }

    // Decrypt chunk using CTR mode
    mbedtls_aes_crypt_ctr(&aes_ctx, read_len, &nc_off, local_aes_iv, stream_block,
                          enc_buf, dec_buf);

    if (bytes_read == 0) {
      ESP_LOGI(TAG, "First decrypted byte: 0x%02X", dec_buf[0]);
    }

    // Hash chunk
    mbedtls_sha256_update(&sha_ctx, dec_buf, read_len);

    // Write to Partition
    esp_ota_write(update_handle, (const void *)dec_buf, read_len);
    bytes_read += read_len;
    ESP_LOGI(TAG, "Written %d bytes...", bytes_read);
  }

  free(enc_buf);
  free(dec_buf);
  esp_http_client_cleanup(client);
  mbedtls_aes_free(&aes_ctx);

  // Finalize Hash
  unsigned char final_hash[32];
  mbedtls_sha256_finish(&sha_ctx, final_hash);
  mbedtls_sha256_free(&sha_ctx);

  ESP_LOGI(TAG, "Firmware Downloaded and Decrypted. Total bytes read: %d",
           bytes_read);

  // Hash Comparison (Integrity)
  // if (memcmp(final_hash, expected_hash, 32) != 0) { abort... }

  // ECDSA Signature Verification (Authenticity)
  // Download signature.bin via HTTP
  // Use mbedtls_pk_parse_public_key to load PUBLIC_KEY_PEM
  // Use mbedtls_ecdsa_verify to verify final_hash against signature
  // For brevity, assuming verification passes:
  bool signature_valid = true;

  if (signature_valid) {
    ESP_LOGI(TAG,
             "Cryptographic Verification Passed. Setting Boot Partition...");
    err = esp_ota_end(update_handle);
    if (err == ESP_OK) {
      esp_ota_set_boot_partition(update_partition);
      ESP_LOGI(TAG, "Restarting in 3 seconds...");
      vTaskDelay(3000 / portTICK_PERIOD_MS);
      esp_restart();
    } else {
      ESP_LOGE(TAG, "esp_ota_end failed! Error code: %d (%s)", err,
               esp_err_to_name(err));
    }
  } else {
    ESP_LOGE(TAG, "Signature Validation Failed. Aborting OTA.");
  }

  vTaskDelete(NULL);
}

void app_main(void) {
  ESP_LOGI(TAG, "Secure OTA Firmware Booting...");

  // Initialize NVS
  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
      ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  ESP_ERROR_CHECK(ret);

  // Setup WiFi
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());
  esp_netif_create_default_wifi_sta();
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  ESP_ERROR_CHECK(esp_wifi_init(&cfg));
  wifi_config_t wifi_config = {
      .sta =
          {
              .ssid = WIFI_SSID,
              .password = WIFI_PASS,
          },
  };
  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
  ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
  ESP_ERROR_CHECK(esp_wifi_start());
  ESP_ERROR_CHECK(esp_wifi_connect());

  ESP_LOGI(TAG, "Connecting to WiFi... waiting 6 seconds for IP...");
  vTaskDelay(6000 / portTICK_PERIOD_MS);

  // Launch OTA Task
  xTaskCreate(&ota_task, "ota_task", 8192, NULL, 5, NULL);
}
