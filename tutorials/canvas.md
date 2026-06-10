# Tutorial de canvas no CodeConversa

O canvas é uma área de desenho. No CodeConversa, `canvas(w, h)` cria um canvas como uma mensagem no chat. As outras funções desenham sempre no canvas mais recente.

## 1. Criar um canvas

```js
canvas(400, 300)
```

O primeiro número é a largura. O segundo é a altura. As coordenadas começam no canto superior esquerdo:

- `x` aumenta para a direita.
- `y` aumenta para baixo.

## 2. Limpar ou pintar o fundo

`clear(color)` pinta o canvas inteiro com uma cor CSS.

```js
canvas(400, 300)
clear("white")
```

Você pode usar nomes de cores:

```js
clear("lightblue")
```

Ou códigos hexadecimais:

```js
clear("#ffcc00")
```

Se não passar cor, o canvas fica transparente:

```js
clear()
```

## 3. Desenhar linhas

```js
canvas(400, 300)
clear("white")
drawLine(20, 20, 380, 280, "red")
```

Os parâmetros são:

```js
drawLine(x1, y1, x2, y2, color)
```

## 4. Desenhar círculos

`drawCircle` desenha só a borda. `fillCircle` desenha preenchido.

```js
canvas(400, 300)
clear("#f8fafc")

drawCircle(100, 120, 50, "blue")
fillCircle(260, 120, 50, "orange")
```

Os parâmetros são:

```js
drawCircle(x, y, raio, color)
fillCircle(x, y, raio, color)
```

## 5. Desenhar retângulos

`drawRect` desenha só a borda. `fillRect` desenha preenchido.

```js
canvas(400, 300)
clear("white")

drawRect(40, 40, 120, 80, "green")
fillRect(220, 40, 120, 80, "purple")
```

Os parâmetros são:

```js
drawRect(x, y, largura, altura, color)
fillRect(x, y, largura, altura, color)
```

## 6. Preencher uma área com `floodFill`

`floodFill(x, y, color)` começa em um ponto e pinta a área conectada que tem a mesma cor daquele ponto.

```js
canvas(300, 220)
clear("white")

drawRect(50, 40, 200, 120, "black")
floodFill(100, 80, "#fde68a")
```

Se o ponto estiver fora da área fechada, o preenchimento pode pintar outra região. Pense nele como o balde de tinta de um editor de imagem.

## 7. Escrever texto

`drawText` escreve uma frase. O último parâmetro é um objeto com opções.

```js
canvas(400, 200)
clear("#eef2ff")

drawText(40, 100, "Olá, canvas!", {
  size: 32,
  color: "#1e3a8a",
  font: "serif"
})
```

Você pode usar só algumas opções:

```js
drawText(20, 50, "Texto simples", { size: 24 })
```

## 8. Misturar formas

```js
canvas(400, 300)
clear("#ecfeff")

fillCircle(200, 110, 60, "#fde047")
drawCircle(200, 110, 75, "#ca8a04")

fillRect(80, 190, 240, 60, "#86efac")
drawRect(80, 190, 240, 60, "#166534")

drawLine(80, 190, 200, 120, "#0f172a")
drawLine(320, 190, 200, 120, "#0f172a")

drawText(122, 270, "Minha casa", {
  size: 26,
  color: "#111827",
  font: "sans-serif"
})
```

## 9. Vários canvases

Você pode criar mais de um canvas. As funções de desenho sempre usam o último canvas criado.

```js
canvas(200, 120)
clear("pink")

canvas(200, 120)
clear("lightgreen")
drawLine(0, 0, 200, 120, "darkgreen")
```

O segundo desenho não muda o primeiro canvas.

## Desafio final

Crie um cartão desenhado:

- Fundo colorido.
- Pelo menos uma linha.
- Um retângulo.
- Um círculo.
- Um texto com seu nome.

Comece assim:

```js
canvas(400, 300)
clear("#fef3c7")

fillCircle(80, 80, 40, "#fb7185")
drawRect(140, 50, 200, 100, "#7c3aed")
drawText(70, 230, "Feito por mim!", {
  size: 30,
  color: "#111827",
  font: "serif"
})
```
