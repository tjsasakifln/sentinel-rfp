# Branch Protection Rules - Sentinel RFP

## Objetivo

Configurar regras de proteção para a branch `main` garantindo que todos os checks do CI sejam obrigatórios antes do merge.

## Configuração Manual no GitHub

Acesse: `Settings` → `Branches` → `Add branch protection rule`

### Branch name pattern

```
main
```

### Regras Obrigatórias

#### 1. Require a pull request before merging

- ✅ Require approvals: `1`
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (opcional)

#### 2. Require status checks to pass before merging

- ✅ Require branches to be up to date before merging

**Status checks obrigatórios:**

- `Lint Code`
- `Type Check`
- `Run Tests`
- `Build All Apps`
- `Validate Monorepo Setup`

#### 3. Require conversation resolution before merging

- ✅ Ativado

#### 4. Require signed commits (recomendado)

- ⚠️ Opcional - Requer configuração adicional de GPG

#### 5. Do not allow bypassing the above settings

- ✅ Ativado
- ⚠️ Exceção: Permitir admins bypassarem (opcional)

## Verificação

Após configurar, verifique:

1. Tente fazer push direto para `main` - deve ser bloqueado
2. Crie uma PR de teste - status checks devem aparecer como required
3. Tente fazer merge antes dos checks passarem - deve ser bloqueado
4. Após todos os checks passarem - merge deve ser permitido

## Notas

- Branch protection rules são configuradas **por repositório**
- Alterações nas regras **não afetam PRs abertas anteriormente**
- Admins podem configurar exceções para si mesmos
- Status checks devem ter **exatamente o mesmo nome** dos jobs no workflow

## Script de Verificação

```bash
# Verificar branch protection configurada
gh api repos/:owner/:repo/branches/main/protection

# Listar status checks required
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

## Referências

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
