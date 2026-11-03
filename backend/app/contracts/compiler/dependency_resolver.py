from typing import Any, Dict, List, Set
import uuid


class DependencyCycleError(Exception):
    def __init__(self, cycle_path: List[str]):
        super().__init__(f"Contract dependency cycle detected: {' -> '.join(cycle_path)}")
        self.cycle_path = cycle_path


class DependencyResolver:
    """
    Validates and resolves inter-contract dependency relationships.
    Rejects dependency cycles (e.g. A -> B -> C -> A) deterministically.
    """

    @classmethod
    def check_dependency_cycle(
        cls,
        contract_key: str,
        target_key: str,
        existing_edges: Dict[str, Set[str]],
    ) -> None:
        """
        Tests if adding contract_key -> target_key introduces a cycle.
        If target_key can reach contract_key, adding this dependency creates a cycle.
        """
        if contract_key == target_key:
            raise DependencyCycleError([contract_key, target_key])

        # DFS starting from target_key
        visited = set()
        stack = [target_key]
        path_map: Dict[str, str] = {}

        while stack:
            curr = stack.pop()
            if curr == contract_key:
                # Reconstruct cycle path
                cycle = [contract_key]
                p = curr
                while p in path_map:
                    p = path_map[p]
                    cycle.append(p)
                cycle.reverse()
                cycle.append(target_key)
                raise DependencyCycleError(cycle)

            if curr not in visited:
                visited.add(curr)
                neighbors = existing_edges.get(curr, set())
                for neighbor in neighbors:
                    if neighbor not in visited:
                        path_map[neighbor] = curr
                        stack.append(neighbor)
