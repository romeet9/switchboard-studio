# Run Switchboard Studio in GitHub Codespaces

The Switch server and the four agents run in a Codespace instead of your Mac.
Switch Console stays on your Mac and reaches the Codespace over a forwarded port and SSH.
The same scripts work on any Ubuntu 24.04 server later: run `deploy/setup.sh` once, then `deploy/start.sh`.

Free plan: about 60 hours a month on the 2-core machine. The Codespace stops after the idle timeout
(no typing in it). Agents don't answer while it's stopped. Your files and the server data are kept.

## One-time setup

1. **Create the Codespace** (on your Mac):
   ```sh
   gh auth refresh -h github.com -s codespace
   gh codespace create -R romeet9/switchboard-studio -b main -m basicLinux32gb --idle-timeout 240m --display-name studio
   ```
   The first build takes a few minutes. `deploy/setup.sh` runs by itself and prints the Gateway admin password.

2. **Sign in inside the Codespace.** Open it in the browser (`gh codespace code --web -c <name>`), then in its terminal:
   ```sh
   claude          # sign in to Claude, then type /mcp and sign in to Figma
   studio init     # paste a NEW Figma personal access token when asked
   ```
   Use the browser terminal for this: it forwards the sign-in callbacks for you.

3. **Connect your Mac** (keep the first command running in its own terminal):
   ```sh
   gh codespace ports forward 8000:8000 -c <name>
   gh codespace ssh --config -c <name> > ~/.ssh/codespaces
   grep -q 'Include ~/.ssh/codespaces' ~/.ssh/config 2>/dev/null || printf 'Include ~/.ssh/codespaces\n\n%s' "$(cat ~/.ssh/config 2>/dev/null)" > ~/.ssh/config
   ```

4. **Enroll the Codespace as a machine.** Open `http://localhost:8000` (Gateway; admin login is
   `GATEWAY_ADMIN_EMAIL` / `GATEWAY_ADMIN_PASSWORD` in `deploy/switch/.env`), go to Machines → Add machine
   and copy the one-time code. Switch publishes only dev builds of the controller, so its install script
   finds nothing; use the copy bundled in Switch Console instead (from your Mac):
   ```sh
   S="/Applications/Switch Console.app/Contents/Resources/dist-sidecar"; H=cs.<name>.main
   ssh $H 'mkdir -p ~/.switch-controller'
   for f in agent-controller.mjs shared-host.mjs; do ssh $H "cat > ~/.switch-controller/$f" < "$S/$f"; done
   ssh $H 'node ~/.switch-controller/agent-controller.mjs enroll --server http://localhost:8000 --code <code> --name Codespace'
   ssh $H 'bash /workspaces/switchboard-studio/deploy/start.sh'
   ```
   `deploy/start.sh` starts the controller on every Codespace start from then on.
   Switch Console (optional): Add a server → Connect to an existing server → `http://localhost:8000`.

5. **Recreate the room on the new server:** connect Slack (Messaging apps → Connect → Slack, same tokens
   as before), import `templates/switchboard-studio.template.yaml` and `templates/keeper-addon.template.yaml`
   with **Run location** set to the Codespace host, link your account (Link → This is me), then in the
   Codespace terminal run `studio init --link-only --team weft` and `studio doctor`.

## Every time you use it

1. `gh codespace start -c <name>` (or open it from github.com/codespaces). The server starts by itself.
2. `gh codespace ports forward 8000:8000 -c <name>` on your Mac.
3. Open Switch Console. The agents reconnect within a few minutes.

## Moving to a real server later

On a fresh Ubuntu 24.04 box with Docker and Node 22: clone the repo, run `bash deploy/setup.sh`
and `bash deploy/start.sh`, sign in to Claude and Figma once, and add it in Console as a remote host.
