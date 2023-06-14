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
            : board;

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

        return[...Array(9).keys()].map((v) => v + 1)
            .filter((v) => !this.#board[y].includes(v))
            .filter((v) => !this.#board.map((row) => row[x]).includes(v))
            .filter((v) => !this.#squares[(y / 3 | 0) * 3 + (x / 3 | 0)].includes(v))
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

    print({ fancy = false }: { fancy?: boolean } = {}) {
        if (!fancy) {
            const lines = [
                `+${"---+".repeat(9)}`,
            ].concat(this.#board.flatMap((line) => [`|${line.map((cell) => ` ${cell || " "} |`).join("")}`, `+${"---+".repeat(9)}`]));
    
            return console.log(lines.join("\n"));
        }

        const lines = [
            `┌${"───┬".repeat(8)}───┐`,
        ].concat(this.#board.flatMap(
            (line, y) => [
                `│${line.map((cell, x) => ` ${chalk[((x / 3 | 0) + (y / 3 | 0)) % 2 ? "grey" : "white"][this.#original[y][x] ? "bold" : "white"](cell || " ")} |`).join("")}`,
                `${y === 9 - 1 ? "└" : "├"}${`───${y === 9 - 1 ? "┴" : "┼"}`.repeat(8)}───${y === 9 - 1 ? "┘" : "┤"}`
            ]
        ));

        return console.log(lines.join("\n"));
    }
}

const board = new Sudoku(`\
    030000000
    000195000
    008000060
    800060000
    400800001
    000020000
    060000280
    000419005
    000000070
`);

// const board = new Sudoku(`\
//     534678912
//     672195348
//     198342567
//     859761423
//     426853791
//     713924856
//     961537284
//     287419635
//     345286179
// `);

board.print({ fancy: true });

console.log(board.okay);