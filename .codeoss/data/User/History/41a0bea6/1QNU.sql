CREATE SCHEMA IF NOT EXISTS `giconnect-471219.gi_analytics`;

CREATE TABLE IF NOT EXISTS `giconnect-471219.gi_analytics.raw_events` (
  event_id STRING,
  event_type STRING,
  vendor_id STRING,
  product_id STRING,
  payload JSON,
  occurred_at TIMESTAMP,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(occurred_at)
CLUSTER BY vendor_id;
