import { execFileSync } from "node:child_process";

function check(command, args = ["--version"]) {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    console.log(`ok ${command}: ${output.split("\n")[0]}`);
    return true;
  } catch {
    console.log(`missing ${command}`);
    return false;
  }
}

const ok = [
  check("node", ["--version"]),
  check("npm", ["--version"]),
  check("java", ["-version"]),
  check("adb", ["version"]),
].every(Boolean);

if (!process.env.ANDROID_HOME) {
  console.log("missing ANDROID_HOME");
}

if (!ok || !process.env.ANDROID_HOME) {
  process.exitCode = 1;
}
