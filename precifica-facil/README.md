# Precifica Fácil

Sistema mobile-first de precificação para pequenos negócios criativos.

## Executar
Abra `index.html` em um navegador moderno. Para desenvolvimento local, prefira um servidor estático:
- VS Code + Live Server
- `python -m http.server`

## Funcionalidades
- Custos fixos mensais e salário/pró-labore
- Horas produtivas e cálculo de custo/hora
- Materiais com unidade, quantidade comprada e preço
- Custo unitário automático
- Produtos com foto
- Vários materiais por produto
- Mão de obra por valor ou por horas
- Rateio dos custos fixos por produto
- Outros custos
- Margem de lucro
- Preço sugerido e detalhamento do custo
- Dashboard
- Backup/exportação e importação JSON
- Persistência local via localStorage
- Interface responsiva e mobile-first

## Regra de cálculo
Custo do material = preço pago / quantidade comprada × quantidade usada

Custo real do produto =
materiais + mão de obra + custos fixos rateados + outros custos

Lucro = custo real × margem / 100

Preço sugerido = custo real + lucro

## Observação de produção
Esta versão é uma aplicação frontend local. Para transformar em SaaS multiusuário em produção, o próximo passo é conectar autenticação, banco de dados, armazenamento de imagens e API/backend, além de testes automatizados e regras de rateio mais avançadas.
