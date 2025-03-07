import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import docker
from docker.errors import DockerException, ImageNotFound, NotFound, APIError

logger = logging.getLogger(__name__)

class DockerClient:
    """
    Asynchronous wrapper for the Docker SDK for Python.
    
    This class provides methods for managing Docker containers, images,
    volumes, and networks with proper error handling and async support.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        version: Optional[str] = None,
        timeout: int = 60,
        tls: bool = False,
        ssl_version: Optional[str] = None,
        cert_path: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize the Docker client with connection parameters.
        
        Args:
            base_url: URL to the Docker server (e.g., unix:///var/run/docker.sock or tcp://127.0.0.1:1234)
            version: API version to use (e.g., '1.41')
            timeout: Connection timeout in seconds
            tls: Use TLS for secure connection
            ssl_version: SSL version to use
            cert_path: Path to TLS certificates
            **kwargs: Additional arguments to pass to the Docker client
        """
        self._client_args = {
            "base_url": base_url,
            "version": version,
            "timeout": timeout,
            "tls": tls,
            "ssl_version": ssl_version,
            "cert_path": cert_path,
            **kwargs,
        }
        self._client = None
        self._loop = None

    async def connect(self) -> None:
        """
        Connect to the Docker daemon asynchronously.
        
        This method initializes the Docker client. It should be called before using
        any other methods of this class.
        
        Raises:
            DockerException: If unable to connect to the Docker daemon
        """
        if self._client is None:
            try:
                # Run client initialization in a thread since it can block
                loop = asyncio.get_event_loop()
                self._client = await loop.run_in_executor(
                    None, lambda: docker.DockerClient(**self._client_args)
                )
                self._loop = loop
                logger.info("Successfully connected to Docker daemon")
            except DockerException as e:
                logger.error(f"Failed to connect to Docker daemon: {e}")
                raise

    async def close(self) -> None:
        """
        Close the connection to the Docker daemon.
        
        This method should be called when the client is no longer needed.
        """
        if self._client:
            try:
                await self._loop.run_in_executor(None, self._client.close)
                self._client = None
                logger.info("Closed connection to Docker daemon")
            except Exception as e:
                logger.error(f"Error closing Docker client: {e}")

    async def _run_in_executor(self, func, *args, **kwargs) -> Any:
        """
        Run a function in the executor.
        
        This helper method runs synchronous Docker SDK functions in a thread pool
        executor to prevent blocking the event loop.
        
        Args:
            func: The function to run
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
        
        Returns:
            The result of the function
        
        Raises:
            DockerException: If an error occurs while executing the function
        """
        if not self._client:
            await self.connect()
        
        try:
            return await self._loop.run_in_executor(
                None, lambda: func(*args, **kwargs)
            )
        except DockerException as e:
            logger.error(f"Docker operation failed: {e}")
            raise

    # Container Operations
    async def list_containers(
        self, all: bool = False, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        List containers.
        
        Args:
            all: Show all containers. Only running containers are shown by default
            filters: Filters to process on the containers list (e.g., {"status": "running"})
        
        Returns:
            List of container objects
        """
        try:
            return await self._run_in_executor(
                lambda: self._client.containers.list(all=all, filters=filters)
            )
        except Exception as e:
            logger.error(f"Failed to list containers: {e}")
            raise

    async def get_container(self, container_id: str) -> Any:
        """
        Get a container by ID or name.
        
        Args:
            container_id: The container ID or name
        
        Returns:
            Container object
        
        Raises:
            NotFound: If the container does not exist
        """
        try:
            return await self._run_in_executor(
                lambda: self._client.containers.get(container_id)
            )
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except Exception as e:
            logger.error(f"Failed to get container '{container_id}': {e}")
            raise

    async def create_container(
        self,
        image: str,
        command: Optional[Union[str, List[str]]] = None,
        name: Optional[str] = None,
        detach: bool = True,
        ports: Optional[Dict[int, int]] = None,
        environment: Optional[Dict[str, str]] = None,
        volumes: Optional[Dict[str, Dict[str, str]]] = None,
        network: Optional[str] = None,
        **kwargs
    ) -> Any:
        """
        Create a new container.
        
        Args:
            image: The image to run
            command: The command to run in the container
            name: The name for the container
            detach: Run container in the background
            ports: Port mapping (e.g., {8000: 8000})
            environment: Environment variables (e.g., {"KEY": "VALUE"})
            volumes: Volumes to mount (e.g., {"/host/path": {"bind": "/container/path", "mode": "rw"}})
            network: Network to connect to
            **kwargs: Additional arguments to pass to the Docker API
        
        Returns:
            Container object
            
        Raises:
            ImageNotFound: If the image does not exist
            APIError: If the Docker API returns an error
        """
        try:
            return await self._run_in_executor(
                lambda: self._client.containers.run(
                    image=image,
                    command=command,
                    name=name,
                    detach=detach,
                    ports=ports,
                    environment=environment,
                    volumes=volumes,
                    network=network,
                    **kwargs
                )
            )
        except ImageNotFound:
            logger.error(f"Image '{image}' not found")
            raise
        except APIError as e:
            logger.error(f"API error creating container from '{image}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to create container from '{image}': {e}")
            raise

    async def start_container(self, container_id: str) -> None:
        """
        Start a container.
        
        Args:
            container_id: The container ID or name
            
        Raises:
            NotFound: If the container does not exist
            APIError: If the Docker API returns an error
        """
        try:
            container = await self.get_container(container_id)
            await self._run_in_executor(container.start)
            logger.info(f"Container '{container_id}' started")
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except APIError as e:
            logger.error(f"API error starting container '{container_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to start container '{container_id}': {e}")
            raise

    async def stop_container(
        self, container_id: str, timeout: int = 10
    ) -> None:
        """
        Stop a container.
        
        Args:
            container_id: The container ID or name
            timeout: Timeout in seconds to wait for container to stop before killing it
            
        Raises:
            NotFound: If the container does not exist
            APIError: If the Docker API returns an error
        """
        try:
            container = await self.get_container(container_id)
            await self._run_in_executor(lambda: container.stop(timeout=timeout))
            logger.info(f"Container '{container_id}' stopped")
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except APIError as e:
            logger.error(f"API error stopping container '{container_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to stop container '{container_id}': {e}")
            raise

    async def restart_container(
        self, container_id: str, timeout: int = 10
    ) -> None:
        """
        Restart a container.
        
        Args:
            container_id: The container ID or name
            timeout: Timeout in seconds to wait for container to stop before killing it
            
        Raises:
            NotFound: If the container does not exist
            APIError: If the Docker API returns an error
        """
        try:
            container = await self.get_container(container_id)
            await self._run_in_executor(lambda: container.restart(timeout=timeout))
            logger.info(f"Container '{container_id}' restarted")
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except APIError as e:
            logger.error(f"API error restarting container '{container_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to restart container '{container_id}': {e}")
            raise

    async def remove_container(
        self, container_id: str, force: bool = False, volumes: bool = False
    ) -> None:
        """
        Remove a container.
        
        Args:
            container_id: The container ID or name
            force: Force removal of a running container
            volumes: Remove anonymous volumes associated with the container
            
        Raises:
            NotFound: If the container does not exist
            APIError: If the Docker API returns an error
        """
        try:
            container = await self.get_container(container_id)
            await self._run_in_executor(
                lambda: container.remove(force=force, v=volumes)
            )
            logger.info(f"Container '{container_id}' removed")
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except APIError as e:
            logger.error(f"API error removing container '{container_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to remove container '{container_id}': {e}")
            raise

    async def get_container_logs(
        self,
        container_id: str,
        stdout: bool = True,
        stderr: bool = True,
        stream: bool = False,
        tail: Union[str, int] = "all",
        since: Optional[int] = None,
        until: Optional[int] = None,
        timestamps: bool = False,
        follow: bool = False,
    ) -> Union[str, asyncio.StreamReader]:
        """
        Get logs from a container.
        
        Args:
            container_id: The container ID or name
            stdout: Get STDOUT
            stderr: Get STDERR
            stream: Return a stream object (iteration will block until more logs arrive)
            tail: Output specified number of lines at the end of logs (e.g., "10" or "all")
            since: Show logs since this timestamp
            until: Show logs until this timestamp
            timestamps: Show timestamps
            follow: Follow log output
            
        Returns:
            Container logs as a string or stream
            
        Raises:
            NotFound: If the container does not exist
            APIError: If the Docker API returns an error
        """
        try:
            container = await self.get_container(container_id)
            
            if stream:
                # For streaming logs, we need to handle it differently
                # to maintain asynchronous behavior
                if follow:
                    # Create a queue and a worker to stream logs
                    queue = asyncio.Queue()
                    
                    async def log_worker():
                        logs_generator = container.logs(
                            stdout=stdout,
                            stderr=stderr,
                            stream=True,
                            tail=tail,
                            since=since,
                            until=until,
                            timestamps=timestamps,
                            follow=True,
                        )
                        
                        for line in logs_generator:
                            await queue.put(line)
                        
                        # Signal end of stream
                        await queue.put(None)
                    
                    # Start the worker
                    asyncio.create_task(log_worker())
                    return queue
                else:
                    # Get logs as a generator
                    logs_generator = await self._run_in_executor(
                        lambda: container.logs(
                            stdout=stdout,
                            stderr=stderr,
                            stream=True,
                            tail=tail,
                            since=since,
                            until=until,
                            timestamps=timestamps,
                            follow=False,
                        )
                    )
                    
                    # Convert to async generator
                    async def async_logs_generator():
                        for line in logs_generator:
                            yield line
                    
                    return async_logs_generator()
            else:
                # Get logs as a string
                return await self._run_in_executor(
                    lambda: container.logs(
                        stdout=stdout,
                        stderr=stderr,
                        stream=False,
                        tail=tail,
                        since=since,
                        until=until,
                        timestamps=timestamps,
                    )
                )
        except NotFound:
            logger.error(f"Container '{container_id}' not found")
            raise
        except APIError as e:
            logger.error(f"API error getting logs for container '{container_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to get logs for container '{container_id}': {e}")
            raise

    async def exec_in_container(
        self,
        container_id: str,
        cmd: Union[str, List[str]],
        stdout: bool = True,
        stderr: bool = True,
        stdin: bool = False,
        tty: bool = False,
        privileged: bool = False,
        user: str = "",
        detach: bool = False,
        environment: Optional[Dict[str, str]] = None,
        workdir: Optional[str] = None,
    ) -> Tuple[int, Union[str, bytes]]:
        """
        Execute a command in a running container.
        
        Args:
            container_id: The container ID or name
            cmd: The command to execute
            stdout: Attach to stdout
            stderr: Attach to stderr
            stdin: Attach to stdin
            tty: Allocate a pseudo-TTY
            privileged: Run in privileged mode
            user: User to use for the command (e.g., "root")
            detach: Run command in the background
            environment: Environment variables for the command
            workdir: Working

