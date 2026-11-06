import setuptools

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setuptools.setup(
    name="windows-manager",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Windows sistem yönetimi aracı",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/windows-manager",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: Microsoft :: Windows",
    ],
    python_requires='>=3.7',
    install_requires=[
        'psutil>=5.9.0',
        'pywin32>=304'
    ],
    entry_points={
        'console_scripts': [
            'windows-manager=windows_manager:main',
        ],
    },
)