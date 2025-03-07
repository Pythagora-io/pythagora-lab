import asyncio
import logging
from typing import Dict, List, Optional, Union, Any

import docker
from docker.errors import DockerException, ImageNotFound, NotFound, APIError


class DockerClientError(Exception):
    """Base exception for Docker client errors."""
    pass


class DockerClient:
    """
    Asynchronous wrapper for Docker SDK for Python.
    Provides methods for container management, image operations, and other Docker tasks.
    Supports async context manager protocol (async with).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        version: Optional[str] = None,
        timeout: int = 60,
        tls: bool = False,
        ssl_version: Optional[str] = None,
        logger: Optional[logging.Logger] = None,
    ):
        """
        Initialize Docker client with connection parameters.

        Args:
            base_url: URL to the Docker server (e.g., unix:///var/run/docker.sock or tcp://127.0.0.1:1234)
            version: API version to use
            timeout: Request timeout
            tls: Use TLS
            ssl_version: SSL version to use
            logger: Logger instance
        """
        self.logger = logger or logging.getLogger(__name__)
        
        try:
            self.client = docker.APIClient(
                base_url=base_url,
                version=version,
                timeout=timeout,
                tls=tls,
                ssl_version=ssl_version,
            )
            self.high_level_client = docker.from_env()
            self.logger.info("Docker client initialized successfully")
        except DockerException as e:
            self.logger.error(f"Failed to initialize Docker client: {str(e)}")
            raise DockerClientError(f"Failed to initialize Docker client: {str(e)}")

    async def __aenter__(self):
        """
        Async context manager entry.
        Returns:
            self: The DockerClient instance
        """
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Async context manager exit. Closes the client and releases resources.
        Args:
            exc_type: Exception type if an exception was raised in the context
            exc_val: Exception value if an exception was raised in the context
            exc_tb: Exception traceback if an exception was raised in the context
        """
        await self.close()

    async def ping(self) -> bool:
        """Check Docker daemon connectivity."""
        try:
            result = await self._run_async(self.client.ping)
            return result == {"message": "OK"}
        except DockerException as e:
            self.logger.error(f"Docker ping failed: {str(e)}")
            return False

    async def get_info(self) -> Dict[str, Any]:
        """Get Docker system information."""
        try:
            return await self._run_async(self.client.info)
        except DockerException as e:
            self.logger.error(f"Failed to get Docker info: {str(e)}")
            raise DockerClientError(f"Failed to get Docker info: {str(e)}")

    # Container operations
    async def create_container(
        self,
        image: str,
        command: Optional[Union[str, List[str]]] = None,
        name: Optional[str] = None,
        environment: Optional[Dict[str, str]] = None,
        volumes: Optional[Dict[str, Dict[str, str]]] = None,
        ports: Optional[Dict[str, Union[int, List[int]]]] = None,
        detach: bool = True,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Create a new container.

        Args:
            image: Image to use
            command: Command to run
            name: Container name
            environment: Environment variables as dict
            volumes: Volumes to mount
            ports: Ports to expose
            detach: Run container in the background
            **kwargs: Additional parameters to pass to the Docker API

        Returns:
            Dictionary with container information
        """
        try:
            config = {
                "image": image,
                "command": command,
                "name": name,
                "detach": detach,
                "environment": environment,
                "volumes": volumes,
                "ports": ports,
                **kwargs,
            }
            
            # Remove None values
            config = {k: v for k, v in config.items() if v is not None}
            
            self.logger.info(f"Creating container from image {image}")
            return await self._run_async(self.client.create_container, **config)
        except DockerException as e:
            self.logger.error(f"Failed to create container: {str(e)}")
            raise DockerClientError(f"Failed to create container: {str(e)}")

    async def start_container(self, container_id: str) -> None:
        """Start a container."""
        try:
            self.logger.info(f"Starting container {container_id}")
            await self._run_async(self.client.start, container_id)
        except DockerException as e:
            self.logger.error(f"Failed to start container {container_id}: {str(e)}")
            raise DockerClientError(f"Failed to start container {container_id}: {str(e)}")

    async def stop_container(self, container_id: str, timeout: int = 10) -> None:
        """Stop a container with timeout."""
        try:
            self.logger.info(f"Stopping container {container_id}")
            await self._run_async(self.client.stop, container_id, timeout=timeout)
        except NotFound:
            self.logger.warning(f"Container {container_id} not found")
        except DockerException as e:
            self.logger.error(f"Failed to stop container {container_id}: {str(e)}")
            raise DockerClientError(f"Failed to stop container {container_id}: {str(e)}")

    async def remove_container(self, container_id: str, force: bool = False) -> None:
        """Remove a container."""
        try:
            self.logger.info(f"Removing container {container_id}")
            await self._run_async(self.client.remove_container, container_id, force=force)
        except NotFound:
            self.logger.warning(f"Container {container_id} not found")
        except DockerException as e:
            self.logger.error(f"Failed to remove container {container_id}: {str(e)}")
            raise DockerClientError(f"Failed to remove container {container_id}: {str(e)}")

    async def list_containers(self, all: bool = False) -> List[Dict[str, Any]]:
        """List containers."""
        try:
            return await self._run_async(self.client.containers, all=all)
        except DockerException as e:
            self.logger.error(f"Failed to list containers: {str(e)}")
            raise DockerClientError(f"Failed to list containers: {str(e)}")

    async def container_logs(
        self, container_id: str, stdout: bool = True, stderr: bool = True, tail: str = "all"
    ) -> str:
        """Get container logs."""
        try:
            logs = await self._run_async(
                self.client.logs, container_id, stdout=stdout, stderr=stderr, tail=tail, stream=False
            )
            return logs.decode("utf-8") if isinstance(logs, bytes) else logs
        except NotFound:
            self.logger.warning(f"Container {container_id} not found")
            return ""
        except DockerException as e:
            self.logger.error(f"Failed to get logs for container {container_id}: {str(e)}")
            raise DockerClientError(f"Failed to get logs for container {container_id}: {str(e)}")

    # Image operations
    async def pull_image(self, repository: str, tag: str = "latest") -> None:
        """Pull an image from a registry."""
        try:
            self.logger.info(f"Pulling image {repository}:{tag}")
            await self._run_async(self.client.pull, repository, tag=tag)
        except DockerException as e:
            self.logger.error(f"Failed to pull image {repository}:{tag}: {str(e)}")
            raise DockerClientError(f"Failed to pull image {repository}:{tag}: {str(e)}")

    async def list_images(self) -> List[Dict[str, Any]]:
        """List images."""
        try:
            return await self._run_async(self.client.images)
        except DockerException as e:
            self.logger.error(f"Failed to list images: {str(e)}")
            raise DockerClientError(f"Failed to list images: {str(e)}")

    async def remove_image(self, image: str, force: bool = False) -> None:
        """Remove an image."""
        try:
            self.logger.info(f"Removing image {image}")
            await self._run_async(self.client.remove_image, image, force=force)
        except ImageNotFound:
            self.logger.warning(f"Image {image} not found")
        except DockerException as e:
            self.logger.error(f"Failed to remove image {image}: {str(e)}")
            raise DockerClientError(f"Failed to remove image {image}: {str(e)}")

    # Utility methods
    async def _run_async(self, func, *args, **kwargs):
        """Run a synchronous Docker SDK function in a separate thread."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: func(*args, **kwargs)
        )

    async def close(self) -> None:
        """Close all connections and resources. Called automatically when exiting async with block."""
        try:
            if hasattr(self, 'client') and self.client:
                await self._run_async(self.client.close)
            if hasattr(self, 'high_level_client') and self.high_level_client:
                await self._run_async(self.high_level_client.close)
            self.logger.info("Docker client closed")
        except Exception as e:
            self.logger.error(f"Error closing Docker client: {str(e)}")

