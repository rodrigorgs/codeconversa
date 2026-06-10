# Tutorial de programação no CodeConversa

Este tutorial é para aprender programação criando conversas interativas. Você escreve o código no painel da esquerda, aperta **Run** e vê o resultado como mensagens no celular do meio.

## 1. Escrever mensagens com `print`

`print` mostra uma mensagem no aplicativo.

```js
print("Olá!")
print("Bem-vindo ao CodeConversa")
```

Você pode imprimir várias coisas de uma vez:

```js
print("A resposta é", 42)
```

## 2. Fazer pausas com `delay`

`delay(n)` espera `n` segundos. Enquanto espera, o app mostra uma bolha de digitação.

```js
print("Preparando...")
delay(2)
print("Pronto!")
```

## 3. Reagir à resposta do usuário com `react`

Depois que o usuário responder uma pergunta, `react` coloca uma reação na última mensagem dele.

```js
let nome = read("Qual é o seu nome?")
react("👋")
print("Oi,", nome)
```

## 4. Fazer perguntas com `read` e `readNumber`

`read` lê texto. `readNumber` lê um número.

```js
let nome = read("Qual é o seu nome?")
print("Oi,", nome)

let idade = readNumber("Quantos anos você tem?")
print("Você tem", idade, "anos.")
```

Quando o programa chega em `read` ou `readNumber`, ele pausa até a pessoa responder na caixa de mensagem.

## 5. Guardar valores em variáveis

Uma variável é um nome que guarda um valor.

```js
let escola = "minha escola"
print("Eu estudo na", escola)
```

Você pode mudar o valor depois:

```js
let pontos = 0
pontos = 10
print("Pontos:", pontos)
```

## 6. Fazer contas

Você pode usar `+`, `-`, `*`, `/` e `%`.

```js
let moedas = 10
let bonus = 5
print("Total:", moedas + bonus)

let dobro = moedas * 2
print("Dobro:", dobro)
```

O operador `%` mostra o resto de uma divisão:

```js
print(10 % 3)
```

## 7. Tomar decisões com `if` e `else`

`if` executa um bloco se a condição for verdadeira. `else` executa outro bloco se não for.

```js
let idade = readNumber("Qual é a sua idade?")

if (idade >= 13) {
  print("Você já é adolescente.")
} else {
  print("Você ainda é criança.")
}
```

Comparações úteis:

```js
idade > 10
idade >= 13
idade < 18
idade == 15
idade != 12
```

## 8. Repetir com `while`

`while` repete enquanto a condição for verdadeira.

```js
let contador = 3

while (contador > 0) {
  print("Faltam", contador)
  contador--
}

print("Já!")
```

Cuidado: se a condição nunca ficar falsa, o programa entra em um loop infinito. O CodeConversa interrompe loops muito longos para proteger o navegador.

## 9. Repetir sequências com `for (let x of range)`

`range` cria uma lista de números. O fim entra na lista.

```js
print(range(5, 7))
```

Isso imprime:

```txt
[5,6,7]
```

Use `for...of` para passar por cada valor:

```js
for (let x of range(5, 7)) {
  print("Número:", x)
}
```

Você também pode usar `range` com passo:

```js
for (let x of range(2, 10, 2)) {
  print(x)
}
```

## 10. Guardar listas com arrays

Arrays são listas entre colchetes.

```js
let nomes = ["Ana", "Bia", "Caio"]
print(nomes)
```

Cada item tem uma posição. A primeira posição é `0`.

```js
print(nomes[0])
print(nomes[1])
```

Use `.length` para saber o tamanho:

```js
print("Quantidade:", nomes.length)
```

Você pode trocar um item:

```js
nomes[1] = "Bruno"
print(nomes)
```

E pode percorrer a lista:

```js
for (let nome of nomes) {
  print("Olá,", nome)
}
```

## Desafio final

Crie um miniquiz:

```js
let nome = read("Qual é o seu nome?")
let pontos = 0

print("Olá,", nome)
delay(1)

let resposta = readNumber("Quanto é 7 + 5?")

if (resposta == 12) {
  react("✅")
  print("Acertou!")
  pontos = pontos + 1
} else {
  react("💡")
  print("Quase! A resposta era 12.")
}

print("Pontuação final:", pontos)
```

Agora invente mais perguntas e use arrays para guardar temas, nomes ou respostas possíveis.
