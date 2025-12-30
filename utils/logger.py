
import logging
import sys
from config.settings import settings

def setup_logger(name: str = "tms_core"):
    """
    Sets up a logger with the specified name and level from settings.
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    logger.setLevel(settings.LOG_LEVEL)
    return logger

logger = setup_logger()
