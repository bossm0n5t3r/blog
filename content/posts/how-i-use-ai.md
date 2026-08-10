+++
date = 2026-08-10T23:00:00+09:00
title = "나는 AI를 어떻게 쓰고 있는가"
authors = ["Ji-Hoon Kim"]
tags = ["AI", "Productivity", "Workflow"]
categories = ["AI"]
series = []
+++

![](/images/Written-By-a-Human-Not-By-AI-Badge-white.svg)

## 들어가며

- AI 가 일상에 들어온 지 꽤나 오래되었다.
- 우리는 다양한 AI 모델과 구독 서비스를 사용하며 자신에게 맞는 조합을 찾고 있다.
- 이 글은 AI 에 대한 내 생각과 현재까지 내가 이용해왔던 모델과 서비스들을 정리하고 현재 어떤 모델과 서비스, 그리고 개발 시 어떻게 AI 를 쓰고 있는지 정리하기 위해 작성했다.

## AI 를 어떻게 바라봐야 할까

- 현재 많은 생성형 AI 서비스는 LLM 을 핵심 모델로 활용하고 있다.
- LLM 을 단순화해서 설명하면, 주어진 컨텍스트를 바탕으로 다음 토큰의 확률 분포를 예측하고 이를 반복하며 출력을 생성한다고 볼 수 있다.
- 초기 모델에 비해 현재의 모델은 추론 능력과 결과물의 완성도가 크게 향상되었다.
- 하지만 여전히 잘못된 정보를 생성하거나 사용자의 의도를 잘못 이해할 수 있기 때문에, 결과에 대한 검증과 피드백은 사용자의 몫으로 남아 있다.
- 실제로 최근 GPT-5.6 Sol 은 수학 난제의 증명을 만들어냈고, 그 결과가 논문으로 공개되는 사례도 나오고 있다.
- 결국 사용자의 능력에 따라, AI 를 사용한 결과물의 차이가 유의미하게 드러난다.
- AI 는 결국 도구이고, AI 라는 도구에 대한 이해를 바탕으로 목적에 맞게 사용해야 한다.

## AI 를 어떻게 사용해야 할까

- AI 를 무작정 사용해보면, 무엇이든 만들 수 있을 것만 같다.
- 아래 시나리오를 한 번 생각해보자.
  - 물론 어느 정도 러프한 아이디어도 그럴듯하게 만들어준다.
  - 하지만, 생성된 코드는 나의 고민을 통해 작성된 코드가 아니다. 그렇다 보니 버그 발견에 시간이 걸린다.
  - 물론 버그 수정도 에러 로그를 긁어서 물어보면 해결해준다.
  - 그러면 위 작업이 반복되고, 어느새 토큰 한도 경고가 울리고, 더 비싼 모델을 사용해야 하는 건지 고민하게 된다.
- 그러면 토큰을 효율적으로 사용하는 방식이 정답인가? 그건 아닌 것 같다.
- 'AI 를 어떻게 사용해야 할까' 에 의문을 가지고 있을 때 나는 아래 영상들을 보게 되었고, 다음과 같은 생각을 가지게 되었다.
  - ["OO해줘" 라고 명령하시면 안 됩니다 | 서울대 박현우 교수 | 샤로잡다 시즌2 (ENG CC)](https://www.youtube.com/watch?v=jHbNYb6Eg_s)
  - [you're letting ai build too fast](https://www.youtube.com/watch?v=1hZe0NpHmIc)
- 우리는 먼저 시스템 아키텍처를 이해하고 설계해야 하며, 엔지니어링에 대한 자신만의 철학을 정립해야 한다.
- AI 와 협업할 때
  - 큰 아이디어를 작은 아이디어로 분해하여, 각 작업을 맡기고, 해당 작업에 대해 직접 피드백해야 한다.
  - 여러 Agent 를 병렬로 실행하여 작업 속도를 높이기보다는, 되도록 순차적으로 실행하여 제어권을 유지해야 한다.
  - 컨텍스트가 불필요하게 커지면서 작업 품질이 떨어지는 것을 피하기 위해, 각 이슈를 특정 컨텍스트 범위 내에서 완료되도록 설계해야 한다.
  - AI 에게 "이 작업을 더 잘 수행하려면 어떤 단계로 진행하면 좋을까?" 와 같이 과정 자체를 설계하도록 요청해보는 것이 좋다.

## 사용했거나 구독했던, 그리고 현재 사용 중인 서비스

- 지난 결제 내역을 모두 기억하지는 못하지만, 순서 없이 사용했던 서비스들을 나열해보자면, 아래와 같다.
  - Perplexity AI (1년 무료 구독)
  - JetBrains AI Pro (All Products Pack 구독)
  - OpenAI ChatGPT Plus, Pro-5x (1 month)
  - Google AI Pro
  - OpenRouter
- 그리고 현재 구독 중인 서비스는 아래와 같다.
  - OpenAI ChatGPT Plus
  - OpenCode Go
- 사실 그때그때 큰 의미를 두고 구독하지는 않았던 것 같다.
- 굳이 괜한 아집으로 구독하지 않은 서비스는 Claude 인데, 이유는 하도 많은 사람들이 호들갑을 떨어서 구독하지 않았다.
  - 실제로 Claude Opus, Sonnet 모델들은 `Perplexity AI`, `JetBrains AI Pro` 등에서 충분히 사용할 수 있었기 때문에 절대 해당 모델을 사용하지 않은 건 아니다.

## 현재 사용 중인 모델과 tool

- 현재 사용하고 있는 tool 은 `oh-my-pi` 이다.
- `pi` 를 사용해보려 했으나, 높은 자유도가 생각보다 부담이 커서 `pi` 를 바탕으로 한 `oh-my-pi` 를 사용해보니, 내 손에 잘 맞아서 쭉 사용하고 있다.
- 현재 사용 중인 모델은 아래와 같다.

```yaml
modelRoles:
  default: opencode-go/kimi-k2.7-code:medium
  smol: opencode-go/qwen3.7-plus:low
  tiny: opencode-go/qwen3.7-plus:low
  task: opencode-go/kimi-k2.7-code:high
  commit: opencode-go/qwen3.7-plus:medium
  plan: openai-codex/gpt-5.6-terra:high
  slow: openai-codex/gpt-5.6-sol:xhigh
  advisor: openai-codex/gpt-5.6-terra:xhigh
  vision: openai-codex/gpt-5.6-terra:medium
```

- 모델은 그때그때 바뀐다.
- 현재 버전의 모델은 https://codeberg.org/bossm0n5t3r/dotfiles/src/branch/master/omp/.omp/agent/config.yml 를 참고하면 된다.

## 마무리

- AI 는 어느새 우리 일상 깊숙이 자리 잡고 있다.
- AI 에 자아를 의탁한 채 사용하는 사람들도 있고, Anti-AI 성향의 사람들도 있다.
- 정답은 없다. 자신의 상황에 맞게 사용하면 된다.
- 도움이 되는 도구도 어느 순간에는 필요 없을 때가 있고, 그렇다고 무조건 안 쓰는 것도 정답은 아니다.
- 모두 자신만의 방법을 찾기를 바란다.
