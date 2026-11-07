// must be imported before any src module so the faiss store lands in a temp dir
import fs from "fs";
import os from "os";
import path from "path";

process.env.FAISS_STORE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hub-faiss-"));
