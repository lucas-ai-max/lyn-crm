# Lyn CRM - Design System

Este documento descreve o Design System oficial do Lyn CRM, baseado no Design System mLabs.

## Paleta de Cores

### Cores Primarias
- **Lyn Primary** `#1A73E8` - Cor principal da marca (Azul)
- **Lyn Primary Light** `#5FC1F8` - Variacao clara para backgrounds e hovers
- **Lyn Primary Deep** `#1565C0` - Variacao escura para contraste

### Cor de Destaque
- **Lyn Accent** `#F26526` - Cor de destaque/CTA (Laranja)

### Cores Neutras
- **Fundo Geral** `#F4F9FE`
- **Branco** `#FFFFFF`
- **Borda** `#E5E7EB`
- **Texto** `#474747`
- **Texto Heading** `#1F2937`
- **Texto Secundario** `#6B7280`

### Cores de Status do Funil
- **Novos** `#1A73E8`
- **Qualificacao** `#5B8CFF`
- **Objecao** `#F4C63D`
- **Negociacao** `#FF9F43`
- **Agendamento** `#34D399`

### Dark Mode
- **Fundo** `#0F1117`
- **Cards** `#1A1D25`
- **Bordas** `#2A2E37`
- **Texto** `#F8FAFC`
- **Primary** `#1A73E8`
- **Accent** `#F26526`

## Tipografia

**Familia Principal:** Poppins
**Pesos:** 200 (ExtraLight), 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Uso em Tailwind
```tsx
className="font-poppins font-medium"
```

## Componentes

### Cards
- **Fundo:** `#FFFFFF` / Dark: `#1A1D25`
- **Borda:** `#E5E7EB` / Dark: `#2A2E37`
- **Border Radius:** `22px` (`rounded-[22px]`)
- **Sombra:** `0 0 8px 0 rgba(0,0,0,0.1)` (`shadow-lyn`)
- **Hover:** `shadow-lyn-hover` + `translateY(-2px)`

### Botoes
- **Border Radius:** `50px` (`rounded-full`) - Pill shape
- **Primario:** Fundo `#1A73E8`, Texto branco
- **Secundario:** Fundo `#5FC1F8`, Texto `#1565C0`
- **Outline:** Borda `#1A73E8`, Texto `#1A73E8`
- **Letter Spacing:** `tracking-wide`

### Inputs
- **Border Radius:** `50px` (`rounded-full`) - Pill shape
- **Borda:** `#E5E7EB`
- **Focus:** Anel `#1A73E8`
- **Padding:** `px-5 py-2`

## Espacamentos

Baseado em multiplos de 4px:
- `4px` (spacing-1)
- `8px` (spacing-2)
- `12px` (spacing-3)
- `20px` (spacing-5)
- `24px` (spacing-6)
- `32px` (spacing-8)
- `48px` (spacing-12)

## Layout

- **Largura Maxima:** `1280px`
- **Sidebar:** `260px`
- **Grid:** 12 colunas
- **Gutters:** `24px`

## Sombras

```tsx
shadow-lyn        // 0 0 8px 0 rgba(0,0,0,0.1) - Padrao cards
shadow-lyn-hover  // 0 4px 16px 0 rgba(0,0,0,0.15) - Hover cards
shadow-lyn-btn    // 0 7px 8px 2px rgba(0,0,0,0.07) - Hover botoes
```

## Animacoes

```tsx
animate-slide-in-right    // slideInFromRight 0.6s
animate-slide-in-top       // slideInFromTop 0.5s
animate-fade-opacity-pulse // loadingOpacity 1.5s infinite
animate-fade-in-up         // fadeInUp 0.5s
```

## Classes Tailwind Principais

### Cores
```tsx
// Primarias
bg-lyn-primary
bg-lyn-primary-light
bg-lyn-primary-deep
bg-lyn-accent

// Status do Funil
bg-status-novos
bg-status-qualificacao
bg-status-objecao
bg-status-negociacao
bg-status-agendamento
```

### Componentes
```tsx
// Card oficial
<Card className="shadow-lyn">

// Botao primario (pill shape)
<Button variant="default">

// Botao outline
<Button variant="outline">

// Input com foco (pill shape)
<Input className="focus-visible:ring-lyn-primary">
```

## Uso Correto

FAZER:
- Usar tokens semanticos (`bg-lyn-primary`)
- Seguir espacamentos baseados em 4px
- Aplicar `shadow-lyn` em cards
- Usar fonte Poppins em todos os textos
- Manter border-radius consistente (22px cards, 50px botoes/inputs)

NAO FAZER:
- Cores hardcoded como `text-blue-500`
- Espacamentos arbitrarios como `p-[13px]`
- Sombras customizadas fora do padrao
- Fontes diferentes de Poppins
- Border-radius inconsistente
