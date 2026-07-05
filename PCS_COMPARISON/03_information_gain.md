# PCS Benchmark Comparison v1.0

## Information Gain Framework

## Purpose

This document defines a conservative information-gain concept for comparing PCS Benchmark v1 with simpler baselines. It does not compute prediction accuracy and does not claim that PCS contains more physical information unless the required projections are actually available.

## Representational Information

For this comparison, information gain means the increase in represented observable domains relative to a baseline. It is not Shannon information, mutual information, forecast skill, or causal explanatory power unless a separate statistical study explicitly defines and estimates those quantities.

## Baseline A to Baseline B

Baseline A includes only:

\[
\{L_T\}.
\]

Baseline B includes:

\[
\{L_T,L_C\}.
\]

The representational increment from Baseline A to Baseline B is the addition of the chemical projection:

\[
\Delta_{A\rightarrow B}=\{L_C\}.
\]

## Baseline B to PCS Benchmark v1

PCS Benchmark v1 intends to include:

\[
\{L_T,L_C,L_S,L_I\}.
\]

The intended representational increment relative to Baseline B is:

\[
\Delta_{B\rightarrow PCS}=\{L_S,L_I\}.
\]

In the current benchmark dataset, this increment is not operationally realized because \(L_S\) and \(L_I\) are missing. The comparison must therefore distinguish intended information gain from realized information gain.

## Realized Information Gain

Define the realized projection set for model \(M\) as:

\[
A_M(t)=\{L_i(t): L_i(t)\ \mathrm{is\ available}\}.
\]

The realized information gain from model \(M_1\) to model \(M_2\) is the set difference:

\[
G(M_1,M_2;t)=A_{M_2}(t)\setminus A_{M_1}(t).
\]

If no additional projections are available, the realized information gain is empty even if the intended PCS framework is broader.

## Interpretation Rules

- Intended projection scope may be broader than realized projection scope.
- Missing projections must not be treated as implicit information.
- No information-gain metric should be interpreted as predictive improvement.
- Any future use of entropy, mutual information, or information criteria requires a separate statistical definition.

