+++
date = 2025-12-20T18:00:00+09:00
title = "[그림과 실습으로 배우는 쿠버네티스 입문] 8장. 전체 복습: 애플리케이션 고치기"
authors = ["Ji-Hoon Kim"]
tags = ["k8s", "kubernetes"]
categories = ["k8s", "kubernetes"]
series = ["k8s", "kubernetes"]
+++

![cover.jpg](/images/books/bbf-k8s/cover.jpg)

## 8.1 준비 환경 만들기

- NodePort 설정하기

```bash
~
❯ kind delete cluster                      
Deleting cluster "kind" ...
Deleted nodes: ["kind-control-plane"]

~
❯ k get pod --namespace kube-system      
E1220 17:41:17.908229   12364 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1220 17:41:17.908877   12364 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1220 17:41:17.909893   12364 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1220 17:41:17.910403   12364 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1220 17:41:17.911506   12364 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
The connection to the server localhost:8080 was refused - did you specify the right host or port? 
~
❯ cd ~/gitFolders/build-breaking-fixing-kubernetes

~/gitFolders/build-breaking-fixing-kubernetes master
❯ kind create cluster --name kind-nodeport --config kind/export-mapping.yaml --image=kindest/node:v1.34.0
Creating cluster "kind-nodeport" ...
 ✓ Ensuring node image (kindest/node:v1.34.0) 🖼
 ✓ Preparing nodes 📦  
 ✓ Writing configuration 📜 
 ✓ Starting control-plane 🕹️ 
 ✓ Installing CNI 🔌 
 ✓ Installing StorageClass 💾 
Set kubectl context to "kind-kind-nodeport"
You can now use your cluster with:

kubectl cluster-info --context kind-kind-nodeport

Not sure what to do next? 😅  Check out https://kind.sigs.k8s.io/docs/user/quick-start/

```

## 8.2 애플리케이션 환경 구축하기

```bash
~/gitFolders/build-breaking-fixing-kubernetes master
❯ kind create cluster --name kind-nodeport --config kind/export-mapping.yaml --image=kindest/node:v1.34.0
Creating cluster "kind-nodeport" ...
 ✓ Ensuring node image (kindest/node:v1.34.0) 🖼
 ✓ Preparing nodes 📦  
 ✓ Writing configuration 📜 
 ✓ Starting control-plane 🕹️ 
 ✓ Installing CNI 🔌 
 ✓ Installing StorageClass 💾 
Set kubectl context to "kind-kind-nodeport"
You can now use your cluster with:

kubectl cluster-info --context kind-kind-nodeport

Not sure what to do next? 😅  Check out https://kind.sigs.k8s.io/docs/user/quick-start/

~/gitFolders/build-breaking-fixing-kubernetes master 14s
❯ k apply --filename chapter-08/hello-server.yaml --namespace default 
deployment.apps/hello-server created
configmap/hello-server-configmap created
service/hello-server-external created
poddisruptionbudget.policy/hello-server-pdb created

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace default                                      
NAME                            READY   STATUS    RESTARTS   AGE
hello-server-69897574df-2srpp   0/1     Running   0          29s
hello-server-69897574df-928w4   1/1     Running   0          29s
hello-server-69897574df-frp57   0/1     Running   0          29s

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace default
NAME                            READY   STATUS    RESTARTS   AGE
hello-server-69897574df-2srpp   1/1     Running   0          2m
hello-server-69897574df-928w4   1/1     Running   0          2m
hello-server-69897574df-frp57   1/1     Running   0          2m

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'
172.20.0.2%                                                                     
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ curl 172.20.0.2:30599                           
^C

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ colima ssh           
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ curl 172.20.0.2:30599
Hello, world! Let's learn Kubernetes!
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ exit
logout

```

## 8.3 애플리케이션 업데이트하기

```bash
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k apply --filename chapter-08/hello-server-update.yaml --namespace default 
deployment.apps/hello-server configured
configmap/hello-server-configmap configured
service/hello-server-external unchanged
poddisruptionbudget.policy/hello-server-pdb configured
```

## 8.4 정상 상태 확인하기

```bash
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ colima ssh
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ curl 172.20.0.2:30599
Hello, world! Let's learn Kubernetes!bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ exit
logout

~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 11s
❯ curl localhost:30599 
Hello, world! Let's learn Kubernetes!%                                          
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get deployment --namespace default                   
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-server   3/3     1            3           29m

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get replicaset --namespace default
NAME                      DESIRED   CURRENT   READY   AGE
hello-server-58ffcb6865   1         1         0       104s
hello-server-69897574df   3         3         3       29m
```

- AGE 가 작은 ReplicaSet 의 READY 가 0 이고, 오래된 ReplicaSet 의 READY 가 3 인 상태
- 이유는 모르겠지만, 오래된 버전의 애플리케이션이 계속 동작 중
- 여기서 실전 연습! 다음을 목표로 원인을 조사하고 해결해보자.
    - 애플리케이션에 요청하면 “Hello, world! Let’s build, break and fix” 가 반환된다.
    - AGE 가 적은 ReplicaSet 의 READY 가 3이 된다.

### 내가 찾은 정답

```bash
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get configmap hello-server-configmap --output yaml --namespace default
apiVersion: v1
data:
  HOST: localhost
  PORT: "8082"
kind: ConfigMap
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"HOST":"localhost","PORT":"8082"},"kind":"ConfigMap","metadata":{"annotations":{},"name":"hello-server-configmap","namespace":"default"}}
  creationTimestamp: "2025-12-20T08:51:01Z"
  name: hello-server-configmap
  namespace: default
  resourceVersion: "3283"
  uid: 972db606-72f9-46b6-ad23-cb2f8a7021b7

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k edit deployment --namespace default       
deployment.apps/hello-server edited

~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 1m 6s
❯ k get pod --namespace default        
NAME                            READY   STATUS              RESTARTS   AGE
hello-server-69897574df-928w4   1/1     Running             0          71m
hello-server-c455d7c95-2zc6s    1/1     Running             0          46s
hello-server-c455d7c95-m2hms    1/1     Running             0          74s
hello-server-c455d7c95-rsrvz    0/1     ContainerCreating   0          14s

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace default
NAME                           READY   STATUS    RESTARTS   AGE
hello-server-c455d7c95-2zc6s   1/1     Running   0          77s
hello-server-c455d7c95-m2hms   1/1     Running   0          105s
hello-server-c455d7c95-rsrvz   1/1     Running   0          45s

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ curl localhost:30599
curl: (52) Empty reply from server

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ colima ssh          
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ curl 172.20.0.2:30599
curl: (7) Failed to connect to 172.20.0.2 port 30599 after 0 ms: Couldn\'t connect to server
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ ^C
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ exit
logout
FATA[0018] exit status 130                              

~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 18s
❯ curl localhost:8082          
curl: (7) Failed to connect to localhost port 8082 after 0 ms: Couldn\'t connect to server

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k describe pod hello-server-c455d7c95-2zc6s 
Name:             hello-server-c455d7c95-2zc6s
Namespace:        default
Priority:         0
Service Account:  default
Node:             kind-nodeport-control-plane/172.20.0.2
Start Time:       Sat, 20 Dec 2025 19:02:14 +0900
Labels:           app=hello-server
                  pod-template-hash=c455d7c95
Annotations:      <none>
Status:           Running
IP:               10.244.0.15
IPs:
  IP:           10.244.0.15
Controlled By:  ReplicaSet/hello-server-c455d7c95
Containers:
  hello-server:
    Container ID:   containerd://276289f5f6d1b0e9211a8ab313306d408417e28186caded64b12b3e45a214a48
    Image:          blux2/hello-server:2.0.1
    Image ID:       docker.io/blux2/hello-server@sha256:7cf006b172cb3d5a2d54f7a035dfb556405e3df90677ff3383b5c8001035d1f6
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Sat, 20 Dec 2025 19:02:39 +0900
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     10m
      memory:  256Mi
    Requests:
      cpu:      10m
      memory:   256Mi
    Liveness:   http-get http://:8082/healthz delay=10s timeout=1s period=5s #success=1 #failure=3
    Readiness:  http-get http://:8082/healthz delay=5s timeout=1s period=5s #success=1 #failure=3
    Environment:
      PORT:  <set to the key 'PORT' of config map 'hello-server-configmap'>  Optional: false
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-b24td (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  kube-api-access-b24td:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   Guaranteed
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  2m20s  default-scheduler  Successfully assigned default/hello-server-c455d7c95-2zc6s to kind-nodeport-control-plane
  Normal  Pulled     2m15s  kubelet            spec.containers{hello-server}: Container image "blux2/hello-server:2.0.1" already present on machine
  Normal  Created    2m15s  kubelet            spec.containers{hello-server}: Created container: hello-server
  Normal  Started    115s   kubelet            spec.containers{hello-server}: Started container hello-server

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'
172.20.0.2%                                                                     

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get service --namespace default                                 
NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
hello-server-external   NodePort    10.96.192.102   <none>        8081:30599/TCP   75m
kubernetes              ClusterIP   10.96.0.1       <none>        443/TCP          82m

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k edit service                       
service/hello-server-external edited
service/kubernetes skipped

~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 21s
❯ k rollout restart deployment/hello-server --namespace default
deployment.apps/hello-server restarted

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace default                                
NAME                            READY   STATUS              RESTARTS   AGE
hello-server-7bb7899485-r4m8x   0/1     ContainerCreating   0          7s
hello-server-c455d7c95-2zc6s    1/1     Running             0          5m1s
hello-server-c455d7c95-m2hms    1/1     Running             0          5m29s
hello-server-c455d7c95-rsrvz    1/1     Running             0          4m29s

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace default
NAME                            READY   STATUS    RESTARTS   AGE
hello-server-7bb7899485-2nxnb   1/1     Running   0          28s
hello-server-7bb7899485-mrcgp   1/1     Running   0          56s
hello-server-7bb7899485-r4m8x   1/1     Running   0          89s

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ curl localhost:30599
Hello, world! Let's build, break and fix!%                                      
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ colima ssh          
bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ curl 172.20.0.2:30599
Hello, world! Let's build, break and fix!bossm0n5t3r@colima:/Users/bossm0n5t3r/gitFolders/build-breaking-fixing-kubernetes$ exit
logout

```

1. Pod 를 조사함
    1. readiness, liveness pod 가 제대로 안되는 것을 확인
2. configmap 의 PORT 가 8082 임을 확인 및 기존 readiness, liveness 포트가 다른 것을 확인
3. 아래처럼 수정
    1. `port: 8081 -> 8082` 로 수정
        1. 수정 후 배포하였으나 status 404 확인
    2. `path: /health -> /healthz` 로 수정
4. Pod 가 모두 새로 뜬 것을 확인
5. `curl localhost:30599` 호출 시 `curl: (52) Empty reply from server` 으로 응답 못하는 것을 확인
6. `k get service --namespace default` 명령어로 `8081:30599` 로 매핑된 것을 확인
7. 매핑 포트를 8081 에서 8082 로 변경 후 rollout 처리

    ```bash
    ~/gitFolders/build-breaking-fixing-kubernetes master ⇡
    ❯ k get service --namespace default                                 
    NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
    hello-server-external   NodePort    10.96.192.102   <none>        8081:30599/TCP   75m
    kubernetes              ClusterIP   10.96.0.1       <none>        443/TCP          82m
    
    ~/gitFolders/build-breaking-fixing-kubernetes master ⇡
    ❯ k edit service                       
    service/hello-server-external edited
    service/kubernetes skipped
    
    ~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 21s
    ❯ k rollout restart deployment/hello-server --namespace default
    deployment.apps/hello-server restarted
    
    ```

8. 이후 정상 동작 확인

과연 정답은…?

## 8.5 원인 조사하기

- 여기서 설명하는 접근 방법이 유일한 정답은 아님
- 더 자세히 알아보려면 먼저 Pod 를 확인해야 함

```bash
k get pod --namespace default
k describe pod <Ready 가 아닌 Pod 의 이름> --namespace default
```

- Readiness probe, Liveness probe 가 모두 실패하는 것을 확인
- 헬스 체크용 엔드포인트에 접속이 안되는 상황으로 몇 가지 원인을 생각해볼 수 있음
    - 애플리케이션 내부 문제로 헬스 체크를 통과하지 못하고 있음
    - 헬스 체크용 엔드포인트 (포트 번호, 경로) 설정이 잘못되었음
- 추가로 로그도 확인

```bash
~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k logs hello-server-7f5bfc855f-ptkml              
2025/12/20 09:49:42 Starting server on port 8082

```

- 매니페스트의 헬스 체크 설정을 확인

```bash
k get deployment hello-server --output yaml --namespace default
```

- 포트가 8081 로 되어있는 것을 확인
- 이를 변경하고 적용
- 아직 Ready 상태가 아님
- 다시 Pod 를 보면 404 status code 임을 확인
- 태그 변경사항을 보고, 실제로 깃허브에서 변경 사항을 확인
    - 아니 이게 가능했구나…
- 경로가 `/health` 가 아닌 `/healthz` 임을 확인
- 해당 경로로 변경 및 적용
- Pod 가 모두 잘 뜬 것을 확인
- 이후 애플리케이션에 접속 시도했으나 실패함

```bash
curl localhost:30599
```

- 무엇이 문제인지 디버그용 컨테이너를 실행하여 내부 연결 확인

```bash
k debug --stdin --tty <임의의 Pod 이름> --image=curlimages/curl --container=debug-container -- sh
```

- 디버그용 컨테이너 내부에서 localhost 접속해봤는데 문제없이 동작함
- 다른 터미널에서 Pod 의 IP 주소를 확인하고 Pod 간 통신을 확인

```bash
k get pod --output wide --namespace default
```

- 임의의 Pod 를 하나 선택하여 IP 주소를 복사함
- 그리고 아까 디버그용 컨테이너 터미널로 돌아가서 연결를 확인

```bash
# Debug container
curl <Pod 의 IP 주소>:8082
```

- Pod 간 통신에도 문제가 없음을 확인
- 이제 Service 를 의심해볼 차례

```bash
k get service --namespace default
```

- 서버가 대기하는 포트 번호도 8081 에서 8082 로 변경되었지만, 이에 대응하는 Service 의 포트 번호가 변경되지 않은 것을 확인
- Deployment 의 매니페스트를 보면 포트 번호를 ConfigMap 에서 읽어오고 있음
- 적용된 매니페스트를 확인
- Service 설정 업데이트가 누락되어 발생한 문제로 확인 및 수정 후 적용
- Pod 에는 변경이 없는 것을 확인
- Service 가 8082번 포트를 지정하게 된 것을 확인
- 접속 확인 후 정상 동작 확인

```bash
~/gitFolders/build-breaking-fixing-kubernetes master ⇡ 15s
❯ kind delete cluster --name kind-nodeport 
Deleting cluster "kind-nodeport" ...
Deleted nodes: ["kind-nodeport-control-plane"]

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace kube-system                                       
E1221 00:50:03.456565   68455 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1221 00:50:03.457105   68455 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1221 00:50:03.458105   68455 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1221 00:50:03.458482   68455 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
E1221 00:50:03.459712   68455 memcache.go:265] "Unhandled Error" err="couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused"
The connection to the server localhost:8080 was refused - did you specify the right host or port?

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ kind create cluster
Creating cluster "kind" ...
 ✓ Ensuring node image (kindest/node:v1.35.0) 🖼 
 ✓ Preparing nodes 📦  
 ✓ Writing configuration 📜 
 ✓ Starting control-plane 🕹️ 
 ✓ Installing CNI 🔌 
 ✓ Installing StorageClass 💾 
Set kubectl context to "kind-kind"
You can now use your cluster with:

kubectl cluster-info --context kind-kind

Thanks for using kind! 😊

~/gitFolders/build-breaking-fixing-kubernetes master ⇡
❯ k get pod --namespace kube-system
NAME                                         READY   STATUS    RESTARTS      AGE
coredns-7d764666f9-7hstl                     1/1     Running   0             80s
coredns-7d764666f9-r982g                     1/1     Running   0             80s
etcd-kind-control-plane                      1/1     Running   2 (54s ago)   88s
kindnet-jwv8f                                1/1     Running   0             80s
kube-apiserver-kind-control-plane            1/1     Running   0             88s
kube-controller-manager-kind-control-plane   1/1     Running   1 (42s ago)   88s
kube-proxy-s9qtc                             1/1     Running   0             80s
kube-scheduler-kind-control-plane            1/1     Running   1 (39s ago)   88s

```

### 결론

- 파악한 원인 및 수정은 다 맞음
- 헬스체크 엔드포인트는 운이 좋게 찾았지만, 실제로 깃허브 확인이 가능했다면 아마 찾았을 것
- 중간에 디버그용 컨테이너를 통해 localhost 확인 및 Pod 간 통신 확인하는 부분이 필요했음
    - 바로 서비스 확인 후 수정해서 해결했지만, 단계별로 해야 하기에
- 그 외에 rollout 한 부분은 불필요했음
