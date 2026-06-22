"""Kafka setup and utilities for audit trail management.

Provides:
- Kafka broker initialization
- Topic creation and management
- Consumer setup for audit event replay
"""
from __future__ import annotations

import logging
from typing import Optional

try:
    from aiokafka import AIOKafkaAdminClient
    from aiokafka.admin import NewTopic
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = logging.getLogger(__name__)


async def create_audit_topic(
    bootstrap_servers: list[str] | str = "localhost:9092",
    topic_name: str = "audit-events",
    num_partitions: int = 3,
    replication_factor: int = 1,
    retention_ms: int = 30 * 24 * 60 * 60 * 1000,  # 30 days
) -> bool:
    """Create Kafka topic for audit events if it doesn't exist.

    Args:
        bootstrap_servers: Kafka broker(s) to connect to
        topic_name: Name of the topic to create
        num_partitions: Number of partitions (for parallelism)
        replication_factor: Replication factor (for durability)
        retention_ms: Retention time in milliseconds (30 days default)

    Returns:
        True if topic was created or already exists, False on error
    """
    if not KAFKA_AVAILABLE:
        logger.warning(
            "aiokafka not available. Cannot create topic. "
            "Install aiokafka: pip install aiokafka"
        )
        return False

    # Normalize bootstrap servers
    if isinstance(bootstrap_servers, str):
        servers = [bootstrap_servers]
    else:
        servers = bootstrap_servers

    try:
        admin_client = AIOKafkaAdminClient(bootstrap_servers=servers)
        await admin_client.start()

        try:
            # Check if topic exists
            existing_topics = await admin_client.list_topics()
            if topic_name in existing_topics:
                logger.info(f"Topic '{topic_name}' already exists")
                return True

            # Create topic
            topic = NewTopic(
                name=topic_name,
                num_partitions=num_partitions,
                replication_factor=replication_factor,
                topic_configs={
                    "retention.ms": str(retention_ms),
                    "compression.type": "snappy",  # Compress for bandwidth
                    "min.insync.replicas": "1",    # For durability
                    "cleanup.policy": "delete",     # Standard cleanup (not compact log)
                },
            )

            result = await admin_client.create_topics([topic], validate_only=False)

            # Check result
            if result.get(topic_name):
                logger.error(f"Failed to create topic '{topic_name}'")
                return False

            logger.info(
                f"Created topic '{topic_name}': "
                f"{num_partitions} partitions, "
                f"replication_factor={replication_factor}, "
                f"retention={retention_ms}ms"
            )
            return True

        finally:
            await admin_client.stop()

    except Exception as exc:
        logger.error(f"Failed to create Kafka topic: {exc}")
        return False


async def get_topic_info(
    bootstrap_servers: list[str] | str = "localhost:9092",
    topic_name: str = "audit-events",
) -> Optional[dict]:
    """Get information about a Kafka topic.

    Args:
        bootstrap_servers: Kafka broker(s) to connect to
        topic_name: Name of the topic

    Returns:
        Dict with topic info, or None if topic doesn't exist
    """
    if not KAFKA_AVAILABLE:
        logger.warning("aiokafka not available. Cannot get topic info.")
        return None

    # Normalize bootstrap servers
    if isinstance(bootstrap_servers, str):
        servers = [bootstrap_servers]
    else:
        servers = bootstrap_servers

    try:
        admin_client = AIOKafkaAdminClient(bootstrap_servers=servers)
        await admin_client.start()

        try:
            # Get topic metadata
            metadata = await admin_client.fetch_all_metadata()

            topic_metadata = metadata.topics().get(topic_name)
            if not topic_metadata:
                return None

            partitions = topic_metadata.partitions()

            return {
                "name": topic_name,
                "num_partitions": len(partitions),
                "partitions": [
                    {
                        "id": p_id,
                        "leader": p_info.leader,
                        "replicas": p_info.replicas,
                        "isr": p_info.isr,
                    }
                    for p_id, p_info in partitions.items()
                ],
            }

        finally:
            await admin_client.stop()

    except Exception as exc:
        logger.error(f"Failed to get topic info: {exc}")
        return None


async def delete_topic(
    bootstrap_servers: list[str] | str = "localhost:9092",
    topic_name: str = "audit-events",
) -> bool:
    """Delete a Kafka topic.

    WARNING: This is destructive and cannot be undone!

    Args:
        bootstrap_servers: Kafka broker(s) to connect to
        topic_name: Name of the topic

    Returns:
        True if topic was deleted, False on error
    """
    if not KAFKA_AVAILABLE:
        logger.warning("aiokafka not available. Cannot delete topic.")
        return False

    # Normalize bootstrap servers
    if isinstance(bootstrap_servers, str):
        servers = [bootstrap_servers]
    else:
        servers = bootstrap_servers

    try:
        admin_client = AIOKafkaAdminClient(bootstrap_servers=servers)
        await admin_client.start()

        try:
            result = await admin_client.delete_topics([topic_name], validate_only=False)

            if result.get(topic_name):
                logger.error(f"Failed to delete topic '{topic_name}'")
                return False

            logger.info(f"Deleted topic '{topic_name}'")
            return True

        finally:
            await admin_client.stop()

    except Exception as exc:
        logger.error(f"Failed to delete topic: {exc}")
        return False


async def get_topic_offset_info(
    bootstrap_servers: list[str] | str = "localhost:9092",
    topic_name: str = "audit-events",
) -> Optional[dict]:
    """Get offset information for a topic.

    Returns info about earliest/latest offsets per partition.

    Args:
        bootstrap_servers: Kafka broker(s) to connect to
        topic_name: Name of the topic

    Returns:
        Dict with offset info per partition, or None on error
    """
    if not KAFKA_AVAILABLE:
        logger.warning("aiokafka not available. Cannot get offset info.")
        return None

    # Normalize bootstrap servers
    if isinstance(bootstrap_servers, str):
        servers = [bootstrap_servers]
    else:
        servers = bootstrap_servers

    try:
        admin_client = AIOKafkaAdminClient(bootstrap_servers=servers)
        await admin_client.start()

        try:
            # Get topic partitions
            partitions = await admin_client.describe_topics([topic_name])
            topic_desc = partitions[0]

            # Get offset ranges for each partition
            from aiokafka import TopicPartition

            offset_info = {}
            for partition_id in range(len(topic_desc.partitions)):
                tp = TopicPartition(topic_name, partition_id)

                # Note: Getting exact offsets requires a consumer
                # This is a simplified example
                offset_info[partition_id] = {
                    "partition": partition_id,
                    # In production, use consumer.beginning_offsets() and end_offsets()
                }

            return offset_info

        finally:
            await admin_client.stop()

    except Exception as exc:
        logger.error(f"Failed to get offset info: {exc}")
        return None
