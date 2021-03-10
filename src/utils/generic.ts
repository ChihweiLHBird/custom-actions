/* eslint-disable @typescript-eslint/no-unused-vars */
import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as exec from '@actions/exec'
import * as core from '@actions/core'
import execa from 'execa'

export function argToMap(additionalArgs: string): Map<string, string> {
    const argArray = additionalArgs.split(/\s*,\s*/).map(part => part.split('='))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Map<string, string>(argArray)
}

function defaultStdOutLineCallback(): (data: string) => void {
    return (data: string) => {
        core.info(data)
    }
}

function defaultStdErrLineCallback(): (data: string) => void {
    return (data: string) => {
        core.error(data)
    }
}

function defaultStdOutCallback(): (data: Buffer) => void {
    return (data: Buffer) => {
        core.info(data.toString().trim())
    }
}

function defaultStdErrCallback(): (data: Buffer) => void {
    return (data: Buffer) => {
        core.error(data.toString().trim())
    }
}

function createExecOpts(
    bufferMode: boolean,
    silent: boolean,
    env: Map<string, string>,
    stdoutCallback: ((data: Buffer) => void) | null,
    stderrCallback: ((data: Buffer) => void) | null,
    stdLineCallback: ((data: string) => void) | null,
    errLineCallback: ((data: string) => void) | null
): ExecOptions {
    const opts: ExecOptions = {
        silent: true
    }
    if (bufferMode) {
        opts.listeners = {
            stdout: stdoutCallback || defaultStdOutCallback,
            stderr: stderrCallback || defaultStdErrCallback,
            stdline: stdLineCallback || defaultStdOutLineCallback,
            errline: errLineCallback || defaultStdErrLineCallback,
            debug: defaultStdOutLineCallback
        }
    } else {
        opts.listeners = {
            stdline: stdLineCallback || defaultStdOutLineCallback,
            errline: errLineCallback || defaultStdErrLineCallback
        }
    }
    if (env !== undefined && env.size > 0) {
        // eslint-disable-next-line github/array-foreach
        env.forEach((value, key) => {
            process.env[key] = value
        })
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        opts.env = {
            ...process.env
        }
    }
    return opts
}

export async function commandRunnerWithEnv(
    cmd: string,
    args: string[],
    silent: boolean,
    env: Map<string, string>,
    stdoutCallback: ((data: Buffer) => void) | null,
    stderrCallback: ((data: Buffer) => void) | null
): Promise<number> {
    const opts = createExecOpts(true, silent, env, stdoutCallback, stderrCallback, null, null)
    return await execaCommandRunner(cmd, args, env, stdoutCallback, stderrCallback, null, null)
}

export async function commandRunner(
    cmd: string,
    args: string[],
    silent: boolean,
    stdoutCallback: ((data: Buffer) => void) | null,
    stderrCallback: ((data: Buffer) => void) | null
): Promise<number> {
    const opts = createExecOpts(true, silent, new Map<string, string>(), stdoutCallback, stderrCallback, null, null)
    return await execaCommandRunner(cmd, args, new Map<string, string>(), stdoutCallback, stderrCallback, null, null)
}

export async function commandRunnerWithLineCallback(
    cmd: string,
    args: string[],
    silent: boolean,
    env: Map<string, string>,
    stdLineCallback: ((data: string) => void) | null,
    errLineCallback: ((data: string) => void) | null
): Promise<number> {
    const opts = createExecOpts(false, silent, env, null, null, stdLineCallback, errLineCallback)
    return await execaCommandRunner(cmd, args, env, null, null, stdLineCallback, errLineCallback)
}

export async function execaCommandRunner(
    cmd: string,
    args: string[],
    env: Map<string, string>,
    stdoutCallback: ((data: Buffer) => void) | null,
    stderrCallback: ((data: Buffer) => void) | null,
    stdLineCallback: ((data: string) => void) | null,
    errLineCallback: ((data: string) => void) | null
): Promise<number> {
    if (env !== undefined && env.size > 0) {
        // eslint-disable-next-line github/array-foreach
        env.forEach((value, key) => {
            process.env[key] = value
        })
    }
    const opts: execa.Options = {
        cleanup: true,
        stdout: process.stdout,
        stderr: process.stderr,
        extendEnv: true,
        env: process.env,
        buffer: true
    }

    const out = await execa(cmd, args, opts)
    if (out.exitCode !== 0) {
        if (stderrCallback !== null) {
            stderrCallback(new Buffer(out.stderr))
        }
        if (errLineCallback !== null) {
            errLineCallback(out.stderr)
        }
    } else {
        if (stdoutCallback !== null) {
            stdoutCallback(new Buffer(out.stdout))
        }
        if (stdLineCallback !== null) {
            stdLineCallback(out.stdout)
        }
    }
    return Promise.resolve(out.exitCode)
}
