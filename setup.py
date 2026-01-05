"""
Setup script for TMS ePOD
Allows pytest to find modules correctly
"""

from setuptools import setup, find_packages

setup(
    name="tms-epod",
    version="2.0.0",
    packages=find_packages(),
    python_requires=">=3.11",
)
