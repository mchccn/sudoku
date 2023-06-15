import chalk from "chalk";
import { readFile } from "fs/promises";
import { join } from "path";
import ui from "readline-ui";

const transpose = <T>(matrix: T[][]) => matrix.map((_, i) => matrix.map((row) => row[i]));
const isUnique = (list: number[]) => new Set(list.filter(Boolean)).size === list.filter(Boolean).length;
const difference = <T>(...arrays: T[][]) => arrays.reduce((a, b) => a.filter((x) => !b.includes(x)));

class Sudoku {
    #board: number[][];
    readonly #original: readonly number[][];

    constructor(board: string | number[][]) {
        this.#board = typeof board === "string"
            ? board
                .replace(/ /g, "0") // change spaces to zero
                .replace(/[^0-9\n]/g, "").trim() // delete all irrelevant characters
                .split("\n").map((line) => line.split("").map(Number))
            : board.map((row) => [...row]); // shallow copy the given board

        if (this.#board.length !== 9 || this.#board.some((row) => row.length !== 9))
            throw new TypeError("board should be 9x9");

        if (this.#board.flat().some((cell) => cell < 0 || cell > 9))
            throw new RangeError("cell values must be 0-9");

        this.#original = this.#board.map((row) => [...row]); // copy original puzzle layout
    }

    get board() {
        return this.#rows;
    }

    get #rows() {
        return this.#board.map((row) => [...row]);
    }

    get #columns() {
        return transpose(this.#board);
    }

    get #squares() {
        return [...Array(9).keys()].map(
            (i) => this.#board.slice((i / 3 | 0) * 3, (i / 3 | 0) * 3 + 3, // y = ⌊n / 3⌋
        ).flatMap((row) => row.slice((i % 3) * 3, (i % 3) * 3 + 3))); // x = n mod 3
    }

    get okay() {
        const rows = this.#rows.every(isUnique);
        const columns = this.#columns.every(isUnique);
        const squares = this.#squares.every(isUnique);

        return rows && columns && squares;
    }

    get solved() {
        return this.okay && this.#board.flat().every(Boolean); // solved if it's okay and completely filled
    }

    candidates(x: number, y: number) {
        if (x < 0 || x > 8 || y < 0 || y > 8) throw new RangeError("position out of bounds");

        if (this.#board[y][x]) return [];

        return [...Array(9).keys()].map((v) => v + 1)
            .filter((v) => !this.#rows[y].includes(v))
            .filter((v) => !this.#columns[x].includes(v))
            .filter((v) => !this.#squares[(y / 3 | 0) * 3 + (x / 3 | 0)].includes(v))
    }

    solve() {
        if (!this.okay) return undefined;

        const board = new Sudoku(this.#board);
        const solutions: Sudoku[] = [];

        (function backtrack() {
            process.stdout.cursorTo(0, 0);
            process.stdout.clearScreenDown();

            process.stdout.write(chalk.green(`solving... ${solutions.length} solution${solutions.length === 1 ? "" : "s"}`) + "\n");

            process.stdout.write(board.toString("high") + "\n");

            if (!board.okay) return;

            if (board.solved) return solutions.push(board.clone());

            const [x, y] = board.#nextOpenCell();

            if (x === -1 || y === -1) return;

            return board.candidates(x, y).forEach((candidate) => {
                const modified = [[x, y]];

                modified.push(...board.#rule1(x, y));
                modified.push(...board.#rule2(x, y));
                modified.push(...board.#rule3(x, y));
                modified.push(...board.#rule4(x, y));

                board.set(x, y, candidate);

                backtrack();

                modified.forEach(([x, y]) => board.delete(x, y));
            });
        })();

        return solutions.length ? solutions : undefined;
    }

    #rule1(x: number, y: number) {
        const modified: [number, number][] = [];

        for (let i = y; i < 9; i++) {
            for (let j = x + 1; j < 9; j++) {
                const candidates = this.candidates(j, i);

                if (candidates.length !== 1) continue;

                this.set(j, i, candidates[0]);

                modified.push([j, i]);
            }
        }

        return modified;
    }

    #rule2(x: number, y: number) {
        const modified: [number, number][] = [];

        for (let i = y; i < 9; i++) {
            const allowed = this.#rows[i].map((_, j) => this.candidates(j, i));

            const diffs = allowed.map((candidates, i) => difference(candidates, ...allowed.filter((_, j) => j !== i)));
            
            diffs.forEach((diff, j) => {
                if (diff.length === 1) {
                    this.set(j, i, diff[0]);

                    modified.push([j, i]);
                }
            });
        }

        return modified;
    }

    #rule3(x: number, y: number) {
        const modified: [number, number][] = [];

        for (let j = x; j < 9; j++) {
            const allowed = this.#columns[j].map((_, i) => this.candidates(j, i));

            const diffs = allowed.map((candidates, i) => difference(candidates, ...allowed.filter((_, j) => j !== i)));
            
            diffs.forEach((diff, i) => {
                if (diff.length === 1) {
                    this.set(j, i, diff[0]);

                    modified.push([j, i]);
                }
            });
        }

        return modified;
    }

    #rule4(x: number, y: number) {
        const modified: [number, number][] = [];

        const index = (y / 3 | 0) * 3 + (x / 3 | 0);

        for (let k = index; k < 9; k++) {
            const indices = [0, 1, 2, 9, 10, 11, 18, 19, 20].map((v) => v + 3 * k + 18 * (k / 3 | 0));

            const allowed = indices.map((i) => this.candidates(i % 9, i / 9 | 0));

            const diffs = allowed.map((candidates, i) => difference(candidates, ...allowed.filter((_, j) => j !== i)));
            
            diffs.forEach((diff, i) => {
                if (diff.length === 1) {
                    this.set(indices[i] % 9, indices[i] / 9 | 0, diff[0]);

                    modified.push([indices[i] % 9, indices[i] / 9 | 0]);
                }
            });
        }

        return modified;
    }

    set(x: number, y: number, value: number) {
        if (x < 0 || x > 8 || y < 0 || y > 8) throw new RangeError("position out of bounds");

        if (value < 0 || value > 9) throw new RangeError("value must be 0-9");

        this.#board[y][x] = value;
    }

    get(x: number, y: number) {
        if (x < 0 || x > 8 || y < 0 || y > 8) throw new RangeError("position out of bounds");

        return this.#board[y][x];
    }

    delete(x: number, y: number) {
        if (x < 0 || x > 8 || y < 0 || y > 8) throw new RangeError("position out of bounds");

        this.#board[y][x] = 0;
    }

    #nextOpenCell() {
        const y = this.#rows.findIndex((row) => row.includes(0));
        const x = y >= 0 ? this.#rows[y].indexOf(0) : -1;

        return [x, y] as [x: number, y: number];
    }

    clone() {
        return new Sudoku(this.#board);
    }

    toString(detail: "none" | "low" | "high" = "none") {
        if (detail === "none") {
            return this.#board.map((row) => row.join("")).join("\n");
        }

        if (detail === "low") {
            const lines = [
                `+${"---+".repeat(9)}`,
            ].concat(this.#board.flatMap((line) => [`|${line.map((cell) => ` ${cell || " "} |`).join("")}`, `+${"---+".repeat(9)}`]));
    
            return lines.join("\n");
        }

        if (detail === "high") {
            const lines = [
                `┌${"───┬".repeat(8)}───┐`,
            ].concat(this.#board.flatMap(
                (line, y) => [
                    `│${line.map((cell, x) => ` ${chalk[this.#original[y][x] ? "bold" : "white"][((x / 3 | 0) + (y / 3 | 0)) % 2 ? "grey" : "white"](cell || " ")} |`).join("")}`,
                    `${y === 9 - 1 ? "└" : "├"}${`───${y === 9 - 1 ? "┴" : "┼"}`.repeat(8)}───${y === 9 - 1 ? "┘" : "┤"}`
                ]
            ));

            return lines.join("\n");
        }

        throw new TypeError("unknown detail");
    }
}

try {
    const board = process.argv[2]
        ? new Sudoku(await readFile(join(process.cwd(), process.argv[2]), "utf8"))
        : await (() => new Promise<Sudoku>((resolve) => {
        const board = new Sudoku(Array(9).fill(0).map(() => Array(9).fill(0)));

        console.clear();

        const input = ui.create();

        let x = 0;
        let y = 0;

        const render = () => {
            input.render(chalk.dim("use arrow keys and 0-9\n") + board.toString("high"));

            process.stdout.write("\x1b[0;0H"); // move cursor to (0, 0)

            process.stdout.write(`\x1b[${x * 4 + 2}C`); // move cursor right
            process.stdout.write(`\x1b[${y * 2 + 2}B`); // move cursor down
        };

        const done = () => timeout = setTimeout(() => {
            input.close();

            resolve(board);
        }, 5);

        render();

        let timeout: NodeJS.Timeout;

        input.on("keypress", (key: string) => {
            clearTimeout(timeout);

            if (key === "left") if (x > 0) x--; else if (x <= 0 && y > 0) (x = 8, y--);
            if (key === "right") if (x < 8) x++; else if (x >= 8 && y < 8) (x = 0, y++);
            if (key === "up" && y > 0) y--;
            if (key === "down" && y < 8) y++;

            if (key === "number" || key === "space") {
                board.set(x++, y, +input.rl.line.at(-1).trim() || 0);

                if (x > 8 && y < 8) (x = 0, y++);
                if (x > 8) x = 8;
            }
            
            if (key === "backspace") {
                board.delete(x--, y);

                if (x < 0 && y > 0) (x = 8, y--);
                if (x < 0) x = 0;
            }

            input.rl.line = ""; // reset line because arrow keys mess it up

            render();
        });

        input.on("line", done);
    }))();

    const solutions = board.solve();

    console.clear();

    if (solutions) {
        console.log(chalk.cyan(`solved (${solutions.length} solution${solutions.length === 1 ? "" : "s"})`));

        console.log(solutions[0].toString("high"));
    } else {
        console.log(chalk.red("not solvable"));

        console.log(board.toString("high"));
    }
} catch (e) {
    if (e instanceof Error) console.log(chalk.red(e.message));
    else console.log(chalk.red("unknown error"));
}