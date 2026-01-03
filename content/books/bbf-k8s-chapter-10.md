+++
date = 2026-01-03T17:00:00+09:00
title = "[그림과 실습으로 배우는 쿠버네티스 입문] 10장. 쿠버네티스 개발 워크플로 이해하기"
authors = ["Ji-Hoon Kim"]
tags = ["k8s", "kubernetes"]
categories = ["k8s", "kubernetes"]
series = ["k8s", "kubernetes"]
+++

![cover.jpg](/images/books/bbf-k8s/cover.jpg)

## 10.1 쿠버네티스에 배포하기

- 지금까지 실습에서는 쿠버네티스에 매니페스트를 배포하기 위해 `k apply --filename` 같은 명령어를 사용함
- 그런데 지속적인 배포를 생각하면 다음과 같은 문제점이 있음
    - 누가 언제 실행했는지 알 수 없음
    - 명령어 실행으로 매니페스트 충돌이 발생할 수 있음
    - 매번 수동으로 배포하는 것은 번거롭고, 사람의 실수가 발생하기 쉬움
- 이러한 문제점을 해결하기 위한 배포 방법으로 크게 CIOps 와 GitOps 가 있음
- 두 가지 방법 모두 깃허브와 같은 공유 리포지터리를 사용하여 매니페스트의 충돌 및 차이점을 관리함
    - GitOps 의 Git 은 `git` 을 사용하는 것과 무관함

### 10.1.1 Push형 배포 방법: CIOps

- `k apply --filename <파일 이름>` 을 자동화하는 가장 직관적인 방법은 가령 master 브랜치에 feature 브랜치가 병합될 때 자동으로 `k apply`
  가 실행되도록 하는 것
- CI 도구를 사용한 이러한 자동화를 CIOps 라고 함
- 장점
    - 이해하기 쉽고 구축하기도 쉬움
- 단점
    - CI/CD 용 도구에 강력한 권한이 필요
    - 배포용 스크립트가 길고 복잡해지기 쉬움

### 10.1.2 Pull형 배포 방법: GitOps

- GitOps 는 Weaveworks 사가 2017년에 처음 사용한 용어
- Git 과 직접적인 관련은 없음
- 다음 네 가지 정의를 기반으로 함
    - 선언적: 시스템 전체를 선언적으로 기술해야 함
    - 버전 관리와 불변: 바람직한 정규 시스템의 상태가 버전 관리되어야 한다.
    - 자동으로 가져오기: 승인된 변경 사항은 시스템에 자동으로 적용된다.
    - 지속적인 조정: 소프트웨어 에이전트가 정확성을 보장하고 문제가 발생한 경우 알림을 전송함

| CIOps   | GitOps                 |
|---------|------------------------|
| 단순하다    | 보안 리스크에 강하다            |
| 알기 쉽다   | CI 와 CD 를 명확히 분리할 수 있다 |
| 구축하기 쉽다 |                        |
| Push 형  | Pull 형                 |

- GitOps 를 선택하는 이유
    - 자동으로 가져오기 (Pulled automatically) 가 가장 큰 차이점
- 배포 전략에는 Push 형과 Pull 형이 있음
    - CIOps 는 Push 형, GitOps 는 Pull 형
- Pull 형 배포 전략을 사용하면 다음과 같은 이점이 있음

---

이점 1: 보안 리스크를 줄일 수 있다.

- CIOps 는 Push 형이기 때문에 쿠버네티스 클러스터에 매니페스트를 적용하기 위해 쓰기 권한이 필요함
- 이로 인해 쓰기 권한을 가진 인증 정보다 CI 가 탈취되면 읽기와 쓰기 기능이 도용될 수 있음
- GitOps 는 Pull 형이기 때문에 읽기 권한만 있어도 구현이 가능함
- 인증 정보가 도난당하더라도 쓰기 권한이 없기 때문에 CIOps 보다 피해를 줄일 수 있음

---

이점 2: CI 와 CD 를 분리할 수 있다.

- CIOps 는 CI 와 CD 모두 CI 도구를 사용하기 때문에 실행 타이밍과 실행 스크립트 등이 함께 엮일 수 있음
- 서비스나 배포 단위/범위가 작을 때는 큰 문제가 되지 않을 수 있지만,
    - 규모가 커지면 무거운 CI 로 인해서 배포가 오래 걸리거나 CI & CD 스크립트가 커져서 유지보수가 어려운 상태가 될 수 있음
- GitOps 는 전용 배포 도구를 사용하고, 배포 정보를 선언적으로 관리함으로써 CI 와 분리할 수 있음
- CI 와 CD 를 분리할 수 있기 때문에 CI 용 권한을 가진 사람(도구)와 CD 용 권한을 가진 사람(도구)을 나누어 관리할 수 있음

---

- 이러한 이점이 모든 환경에서 유효한 것은 아님
- 특히 쿠버네티스의 규모가 작은 경우에는 이점보다 단점이 더 클 수 있음
- 다음은 GitOps 라는 개념을 워크플로에 통합하는 방법

---

Argo CD

- https://argo-cd.readthedocs.io/en/stable/
- https://github.com/argoproj/argo-cd
- Intuit 사가 인수한 Applatix 사가 자체적으로 개발한 소프트웨어
- GitOps 를 위한 OSS
- Application 이라는 이름의 Custom Resource 를 사용하여, ‘어떤 리포지터리의’, ‘어떤 매니페스트의’, ‘어떤 버전의’ 매니페스트를 ‘어떤 환경에’
  적용할지를 지정함
- Argo CD 자체도 쿠버네티스에 구축됨

---

Spinnaker

- https://spinnaker.io/
- Netflix 사가 개발한 도구
- Argo CD 가 ‘쿠버네티스 전용’인 반면, Spinnaker 는 쿠버네티스 외에도 주요 클라우드 서비스의 여러 기능들을 지원함
- 그래서 Argo CD 는 쿠버네티스 클러스터에 대한 배포만을 다루지만, Spinnaker 는 도커 이미지 빌드와 같은 CI 파이프라인 구축도 가능

---

FluxCD

- https://fluxcd.io/
- 쿠버네티스를 위한 도구
- GitOps 를 제안한 Weaveworks 사가 개발함
- 현재는 Flux v2 를 개발 중
- Argo CD 와 매우 유사하지만, 멀티 테넌시를 지원하는 것이 차이점 중 하나

## 10.2 쿠버네티스 매니페스트 관리

- 매니페스트를 더 쉽게 관리하기 위한 도구들을 소개

### 10.2.1 Helm

- https://helm.sh/
- 패키지 관리자
- 매니페스트를 작성하는 것 이상의 기능을 제공
- Charts 라는 템플릿을 기반으로 `helm install` 을 실행하여 쿠버네티스 클러스터에 매니페스트를 배포함
- ‘템플릿’에 가까운 형식 (jinja2 등) 이기 때문에 간단하고 이해하기 쉬움
    - 반면, 템플릿에 작성된 것 이상의 작업을 하고 싶을 때는 다른 방법도 고려해야 함
- Helm 은 다른 개발자가 개발한 커스텀 컨트롤러용 매니페스트를 사용하고자 할 때 특히 유용함
- Grafana 라는 대시보드용 OSS 를 설치해보자

---

Helm 설치하기

- 공식 문서를 참고해서 설치

```bash
brew install helm
```

---

Helm Chart Repository 추가하기

- Helm Chart 를 설치하기 전에 Helm Chart Repository 를 추가해야 함
- 다음 명령어로 Prometheus 용 리포지터리를 추가

```bash
~ 7s
❯ helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
"prometheus-community" has been added to your repositories

~
❯ helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "istio" chart repository
...Successfully got an update from the "prometheus-community" chart repository
Update Complete. ⎈Happy Helming!⎈
```

---

설치할 네임스페이스 생성하기

- 네임스페이스를 미리 만들자

```bash
~
❯ k create namespace monitoring    
namespace/monitoring created
```

---

helm install 실행하기

```bash
~
❯ helm install kube-prometheus-stack --namespace monitoring prometheus-community/kube-prometheus-stack
NAME: kube-prometheus-stack
LAST DEPLOYED: Sun Dec 28 01:21:46 2025
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
NOTES:
kube-prometheus-stack has been installed. Check its status by running:
  kubectl --namespace monitoring get pods -l "release=kube-prometheus-stack"

Get Grafana 'admin' user password by running:

  kubectl --namespace monitoring get secrets kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo

Access Grafana local instance:

  export POD_NAME=$(kubectl --namespace monitoring get pod -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=kube-prometheus-stack" -oname)
  kubectl --namespace monitoring port-forward $POD_NAME 3000

Get your grafana admin user password by running:

  kubectl get secret --namespace monitoring -l app.kubernetes.io/component=admin-secret -o jsonpath="{.items[0].data.admin-password}" | base64 --decode ; echo

Visit https://github.com/prometheus-operator/kube-prometheus for instructions on how to create & configure Alertmanager and Prometheus instances using the Operator.
```

- 잠시 기다리면 몇 개의 Pod 가 실행되는 것을 확인할 수 있음
- 시간이 걸릴 수 있으니 잠시 후에 아래 명령어를 실행해보자.
    - 중간에
      `Warning  Failed     8s (x6 over 72s)    kubelet            spec.containers{config-reloader}: Error: write /var/lib/kubelet/pods/0bd8d3ec-69b5-4b55-b96b-ab60efe49451/etc-hosts: no space left on device`
      이라는 에러가 발생해서 이미지를 지웠더니 정상적으로 Running 되었다.

```bash
~
❯ k get pod --namespace monitoring
NAME                                                       READY   STATUS    RESTARTS   AGE
alertmanager-kube-prometheus-stack-alertmanager-0          2/2     Running   0          4m8s
kube-prometheus-stack-grafana-54549784dc-l4pxp             3/3     Running   0          5m44s
kube-prometheus-stack-kube-state-metrics-59b9d4c6b-r926q   1/1     Running   0          5m44s
kube-prometheus-stack-operator-6c477dc56-zffbp             1/1     Running   0          5m44s
kube-prometheus-stack-prometheus-node-exporter-gdqtj       1/1     Running   0          5m44s
prometheus-kube-prometheus-stack-prometheus-0              2/2     Running   0          4m8s
```

- 생성된 Service 에 포트 포워딩을 수행하여 대시보드 로그인 화면에 접속해보자.

```bash
~
❯ k port-forward service/kube-prometheus-stack-grafana --namespace monitoring 8080:80
Forwarding from 127.0.0.1:8080 -> 3000
Forwarding from [::1]:8080 -> 3000
```

![0.png](/images/books/bbf-k8s/chapter-10/0.png)

- 책에 나온대로 admin / prom-operator 로 로그인하려고 하니 안된다.
- 다시 설치했을 때 내용을 보니 아래 명령어를 통해 password 를 가져와야 한다.

```bash
~
❯ kubectl --namespace monitoring get secrets kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo
QJ881CgO2qPgHWWZ3A8RzpEL7L1HQdSd125yR7xQ
```

![1.png](/images/books/bbf-k8s/chapter-10/1.png)

- Helm Chart 는 템플릿이라고 했는데, 다음 명령어를 실행하면 어떤 값을 커스터마이즈할 수 있는지 확인할 수 있음

```bash
~
❯ helm show values prometheus-community/kube-prometheus-stack
# Default values for kube-prometheus-stack.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

## Provide a name in place of kube-prometheus-stack for `app:` labels
##
nameOverride: ""

## Override the deployment namespace
##
namespaceOverride: ""

# ... too long ... #
```

- 여기서 출력되는 설정값은 기본값에 해당함
- 이 기본값을 변경하려면 values.yaml 에 설정을 기재하고, `helm install` 의 인자로 지정하면 됨
- 그러면 변경한 값에 맞게 커스터마이즈된 Custom Controller 를 배포하게 됨
- 예를 들어 admin 비밀번호를 변경하고 싶은 경우, 다음과 같이 values.yaml 을 작성하면 됨

```yaml
grafana:
  adminPassword: secure-password
```

- 또한 대부분의 경우 기본값이 작성된 values.yaml 을 깃허브 리포지터리에서 확인할 수 있음
- 그러면 `helm show values` 명령어를 실행하는 것보다 쉽게 값을 확인할 수 있음

---

- `helm install` 명령어를 직접 실행하는 것은 GitOps 의 철학과 맞지 않음
- 그래서 Argo CD 같은 GitOps 에이전트의 사양에 맞게 Helm 설치를 수행하거나, CI 를 사용하여 생성된 매니페스트를 GitOps 로 관리하는 방법이 사용됨
    - 후자의 경우 로컬에서 템플릿을 렌더링하는 `helm template` 이라는 명령어를 사용함

### 10.2.2 Jsonnet

- https://jsonnet.org/
- Helm 보다, Kustomize 보다 훨씬 유연성이 높은 도구
- YAML 이 아닌 JSON 을 다루는 도구이므로, YAML 로 출력하려면 yq 를 사용해야 함
- Jsonnet 자체는 쿠버네티스에 특화된 도구가 아님
- JSON 을 프로그래밍으로 다룰 수 있어 유연성이 높고 활용도가 높음
- 유연성이 높지만, 복잡한 작업을 하려면 그만큼 학습 비용이 필요함
- 또한 독자적인 표기법에도 익숙해져야 함

### 10.2.3 자체 템플릿

- 어떤 도구도 잘 맞지 않은 경우, 템플릿을 직접 작성하는 방법도 있음
- 각 언어에는 템플릿 라이브러리가 존재함
- 본인이 익숙한 언어로 템플릿을 직접 작성하는 것도 좋은 방법

### 10.2.4 Kustomize

- https://kustomize.io/
-
- 환경별로 매니페스트가 약간씩만 다른 경우에는 수정 작업을 최소화하기 위해 차이점만 관리하는 것이 효율적임
- 이때 사용할 수 있는 도구가 Kustomize
- Kustomize 는 매니페스트의 공통 부분을 base 라는 디렉터리에서 관리하고, 환경별 차이점을 overlays 라는 디렉터리에서 관리함
- Argo CD 등의 GitOps 에이전트도 Kustomize 를 지원하므로, CIOps, GitOps 모두에서 사용할 수 있음
- 최종 결과물은 Kustomize 라는 도구를 사용하여 빌드하여 얻음
- kubectl 도 kustomize 를 지원하지만, kubectl 버전에 따라 kustomize 의 버전이 달라질 수 있는 점에 주의해야 함
- kustomize 는 매우 편리한 도구이므로 실습을 통해 자세히 알아보도록 하자

### 10.2.5 [만들기] Kustomize로 매니페스트를 이해하기 쉽게 만들기

- Kustomize 는 현장에서 많이 사용하는 도구
- 사용하기 전에 반드시 익혀야 할 Kustomize 만의 독특한 특성이 있음

---

사전 지식

- Kustomize 에 대해 조금 더 자세히 설명해보겠다
- base 디렉터리와 overlays 디렉터리가 있다고 설명했는데, 빌드할 때는 kustomizaiton.yaml 파일을 참조함
- kustomization.yaml 에는 구체적으로 어떤 디렉터리(파일)가 base 인지, 어떤 디렉터리(파일)가 overlays 인지 기재함
- 다음은 간단한 디렉터리 구성 예시

```
hello-server
├── base
│   ├── deployment.yaml
│   ├── kustomization.yaml
│   └── service.yaml
└── overlays
    ├── production
    │   ├── deployment.yaml
    │   └── kustomization.yaml
    └── staging
        ├── deployment.yaml
        └── kustomization.yaml
```

- base
    - staging 과 production 의 공통 매니페스트가 배치
- overlays
    - 각 디렉터리에는 각 환경 고유의 설정이 배치

---

준비

- 쿠버네티스 클러스터 구성에는 아무런 제약이 없다.
- Kustomize 명령어를 설치하자.
- https://kubectl.docs.kubernetes.io/installation/kustomize/

```bash
~
❯ brew install kustomize
==> Auto-updating Homebrew...
Adjust how often this is run with `$HOMEBREW_AUTO_UPDATE_SECS` or disable with
`$HOMEBREW_NO_AUTO_UPDATE=1`. Hide these hints with `$HOMEBREW_NO_ENV_HINTS=1` (see `man brew`).
==> Fetching downloads for: kustomize
✔︎ Bottle Manifest kustomize (5.8.0)                  Downloaded    7.5KB/  7.5KB
✔︎ Bottle kustomize (5.8.0)                           Downloaded    6.7MB/  6.7MB
==> Pouring kustomize--5.8.0.arm64_sequoia.bottle.1.tar.gz
🍺  /opt/homebrew/Cellar/kustomize/5.8.0: 10 files, 17.5MB
==> Running `brew cleanup kustomize`...
Disable this behaviour by setting `HOMEBREW_NO_INSTALL_CLEANUP=1`.
Hide these hints with `HOMEBREW_NO_ENV_HINTS=1` (see `man brew`).
==> Caveats
zsh completions have been installed to:
  /opt/homebrew/share/zsh/site-functions
```

---

요구사항

- `chapter-10/hello-server.yaml`

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-server
  labels:
    app: hello-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-server
  template:
    metadata:
      labels:
        app: hello-server
    spec:
      containers:
        - name: hello-server
          image: blux2/hello-server:1.8
          resources:
            requests:
              memory: "256Mi"
              cpu: "10m"
            limits:
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: hello-server-pdb
spec:
  maxUnavailable: 10%
  selector:
    matchLabels:
      app: hello-server
```

- 다음 요구사항이 충족되도록 각 디렉터리에 매니페스트를 작성할 것
    - production 환경과 staging 환경에 배포
    - production 의 replicas 는 10 으로 설정
    - production 의 requests.memory 와 requests.limits 는 1Gi 로 설정
    - staging 에서는 PodDestruptionBudget 을 사용하지 않음

---

매니페스트 분할하기

- `kustomize build <디렉터리 이름>` 을 실행하면 여러 매니페스트 파일들을 한 번에 출력할 수 있음
- overlays 와 base 로 나눌 때는 리소스 파일이 분리되어 있는 것이 더 관리하기 쉬움
- 리소스별로 분리하여, 각각 deployment.yaml 과 pdb.yaml 으로 저장함

```
분리 전
chapter-10
└── hello-server.yaml

분리 후
chapter-10
├── deployment.yaml
└── pdb.yaml
```

---

파일을 base 디렉터리에 배치하기

- base 에는 공통 매니페스트를 배치
- 이번에는 PodDistributionBudget 은 production 에서만 사용
- Deployment 는 staging/production 공통으로 사용
- 다음과 같은 구조가 되도록 base, overlays, production, staging 디렉터리를 생성하고, 각각 파일을 배치
- 루트 디렉터리 이름은 어떤 이름이어도 상관없음

```
hello-server
├── base
│   └── deployment.yaml
└── overlays
    ├── production
    │   └── pdb.yaml
    └── staging
```

---

매니페스트의 차이점을 overlays 에 배치하기

- production 만의 차이점을 deployment.yaml 에 작성
- 공통 부분은 base 디렉터리의 것이 사용되므로 차이점만 작성하면 됨
- `chapter-10/kustomize/hello-server/overlays/production/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-server
spec:
  replicas: 10
  template:
    spec:
      containers:
        - name: hello-server
          resources:
            requests:
              memory: "1Gi"
            limits:
              memory: "1Gi"
```

- 이제 디렉터리 구조는 다음과 같음

```
hello-server
├── base
│   └── deployment.yaml
└── overlays
    ├── production
    │   ├── deployment.yaml
    │   └── pdb.yaml
    └── staging
```

---

kustomization.yaml 작성하기

- 이 파일이 없으면 아무것도 빌드되지 않음
- 시험삼아 `kustomize build` 를 실행하면 오류가 발생할 것

```bash
~/gitFolders/build-breaking-fixing-kubernetes master*
❯ cd chapter-10/kustomize/hello-server/overlays/production 

~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server/overlays/production master*
❯ kustomize build
Error: unable to find one of 'kustomization.yaml', 'kustomization.yml' or 'Kustomization' in directory '/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server/overlays/production'
```

- kustomization.yaml 에서 자주 사용되는 설정 키워드로 resources 와 patches 가 있음
- 이 외에도 다양한 설정이 가능하지만, 우선 이 두 가지를 기억하는 것이 좋음
- resources
    - 사용할 리소스를 담은 디렉터리나 파일을 지정함
    - base 디렉터리나 해당 디렉터리 고유의 파일을 지정함
- patches
    - overlays 와 base 의 설정을 덮어쓸 때 사용함
    - 덮어쓸 파일명을 지정함
- 각 디렉터리에 작성할 kustomization.yaml 에 대해 알아보자
- resources 로 디렉터리를 지정할 때는 대상 디렉터리에도 kustomization.yaml 이 있어야 함
- 따라서 base 디렉터리에도 kustomization.yaml 을 작성해야 함
- 다음 매니페스트를 각 경로로 저장하자

```yaml
# hello-server/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

```yaml
# hello-server/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - pdb.yaml
patches:
  - path: deployment.yaml
```

```yaml
# hello-server/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
```

---

kustomize build 로 파일을 빌드하고 클러스터에 적용하기

- hello-server 디렉터리로 이동하자
- 먼저 로컬에서 `kustomize build` 를 실행하여 빌드 결과를 확인

```bash
~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server master* ⇡
❯ kustomize build ./overlays/staging
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: hello-server
  name: hello-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-server
  template:
    metadata:
      labels:
        app: hello-server
    spec:
      containers:
      - image: blux2/hello-server:1.8
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        name: hello-server
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          limits:
            memory: 256Mi
          requests:
            cpu: 10m
            memory: 256Mi

~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server master* ⇡
❯ kustomize build ./overlays/production 
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: hello-server
  name: hello-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: hello-server
  template:
    metadata:
      labels:
        app: hello-server
    spec:
      containers:
      - image: blux2/hello-server:1.8
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        name: hello-server
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          limits:
            memory: 1Gi
          requests:
            cpu: 10m
            memory: 1Gi
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: hello-server-pdb
spec:
  maxUnavailable: 10%
  selector:
    matchLabels:
      app: hello-server

```

- staging 용 매니페스트를 쿠버네티스 환경에 적용해보자

```bash
~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server master* ⇡
❯ kustomize build ./overlays/staging | k --namespace default apply -f -
deployment.apps/hello-server created
```

- Pod 이 잘 생성되었는지 확인

```bash
~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server master* ⇡
❯ k get pod --namespace default   
NAME                            READY   STATUS    RESTARTS   AGE
hello-server-655dcf956d-7bx22   1/1     Running   0          33s
hello-server-655dcf956d-jzz9b   1/1     Running   0          33s
hello-server-655dcf956d-qtqd2   1/1     Running   0          33s
```

- 삭제할 때도 동일하게 `kustomize build` 를 사용해야 함

```bash
~/gitFolders/build-breaking-fixing-kubernetes/chapter-10/kustomize/hello-server master* ⇡
❯ kustomize build ./overlays/staging | k --namespace default delete -f -
deployment.apps "hello-server" deleted from default namespace
```
