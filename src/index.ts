import chalk from "chalk";

const transpose = <T>(matrix: T[][]) => matrix.map((_, i) => matrix.map((row) => row[i]));
const isUnique = (list: number[]) => new Set(list.filter(Boolean)).size === list.filter(Boolean).length;

class Sudoku {
    #board: number[][];
    readonly #original: readonly number[][];

    constructor(board: string | number[][]) {
        this.#board = typeof board === "string"
            ? board
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
        return this.#board.map((row) => [...row]);
    }

    get #squares() {
        return [...Array(9).keys()].map(
            (i) => this.#board.slice((i / 3 | 0) * 3, (i / 3 | 0) * 3 + 3, // y = ⌊n / 3⌋
        ).flatMap((row) => row.slice((i % 3) * 3, (i % 3) * 3 + 3))); // x = n mod 3
    }

    get okay() {
        const rows = this.#board.every(isUnique);
        const columns = transpose(this.#board).every(isUnique);
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
            .filter((v) => !this.#board[y].includes(v))
            .filter((v) => !this.#board.map((row) => row[x]).includes(v))
            .filter((v) => !this.#squares[(y / 3 | 0) * 3 + (x / 3 | 0)].includes(v))
    }

    solve() {
        if (!this.okay) return undefined;

        const board = new Sudoku(this.#board);
        const solutions: Sudoku[] = [];

        (function backtrack() {
            console.clear();

            board.print("none");

            if (!board.okay) return;

            if (board.solved) return solutions.push(board.clone());

            const [x, y] = board.#nextOpenCell();

            if (x === -1 || y === -1) return;

            return board.candidates(x, y).forEach((candidate) => {
                const modified = [[x, y]];

                for (let i = y; i < 9; i++) {
                    for (let j = x + 1; j < 9; j++) {
                        const candidates = board.candidates(j, i);
    
                        if (candidates.length !== 1) continue;
    
                        board.set(j, i, candidates[0]);
    
                        modified.push([j, i]);
                    }
                }

                board.set(x, y, candidate);

                backtrack();

                modified.forEach(([x, y]) => board.delete(x, y));
            });
        })();

        return solutions.length ? solutions : undefined;
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
        const y = this.#board.findIndex((row) => row.includes(0));
        const x = y >= 0 ? this.#board[y].indexOf(0) : -1;

        return [x, y] as [x: number, y: number];
    }

    clone() {
        return new Sudoku(this.#board);
    }

    print(detail: "none" | "low" | "high" = "none") {
        if (detail === "none") {
            return console.log(this.#board.map((row) => row.join("")).join("\n"));
        }

        if (detail === "low") {
            const lines = [
                `+${"---+".repeat(9)}`,
            ].concat(this.#board.flatMap((line) => [`|${line.map((cell) => ` ${cell || " "} |`).join("")}`, `+${"---+".repeat(9)}`]));
    
            return console.log(lines.join("\n"));
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

            return console.log(lines.join("\n"));
        }
    }
}

const board = new Sudoku(`\
    100060000
    980000605
    000005001
    000000304
    060000900
    040720000
    093076100
    006480007
    500902460
`);

board.print("high");

const solutions = board.solve();

if (solutions) {
    solutions.map((s) => s.print("high"));
} else {
    console.log("not solvable");
}