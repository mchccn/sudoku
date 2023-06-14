codegolfed get squares

```ts
[...Array(9).keys()].map((i) => this.#board.slice((i / 3 | 0) * 3, (i / 3 | 0) * 3 + 3).flatMap((row) => row.slice((i % 3) * 3, (i % 3) * 3 + 3)))
```