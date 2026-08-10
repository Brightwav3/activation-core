# Known limits

- Wake phrase and clap providers deliberately accept injected local signals; physical microphone capture belongs to a reusable audio-input/device boundary.
- This v0.1 runtime is an in-process library and CLI. Network transport and long-running service supervision are out of scope.
