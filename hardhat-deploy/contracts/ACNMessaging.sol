// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AgentCreditNetwork.sol";

/**
 * @title ACNMessaging
 * @notice On-chain messaging system for ACN lenders and borrowers
 * Enables direct communication between loan participants
 */

contract ACNMessaging {
    
    // ============ STRUCTS ============
    
    struct Message {
        uint256 id;
        uint256 loanId;
        address sender;
        string content;
        uint256 timestamp;
        bool isRead;
    }
    
    struct Conversation {
        uint256 loanId;
        address borrower;
        address lender;
        uint256 messageCount;
        uint256 lastMessageAt;
        bool isActive;
    }
    
    // ============ STATE VARIABLES ============
    
    AgentCreditNetwork public acn;
    
    // loanId => array of messages
    mapping(uint256 => Message[]) public messages;
    
    // loanId => conversation details
    mapping(uint256 => Conversation) public conversations;
    
    // message counter for unique IDs
    uint256 public messageCounter;
    
    // ============ EVENTS ============
    
    event MessageSent(
        uint256 indexed messageId,
        uint256 indexed loanId,
        address indexed sender,
        uint256 timestamp
    );
    
    event ConversationCreated(
        uint256 indexed loanId,
        address borrower,
        address lender
    );
    
    event MessagesRead(
        uint256 indexed loanId,
        address reader,
        uint256 count
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyLoanParticipant(uint256 _loanId) {
        require(_isParticipant(_loanId, msg.sender), "Not loan participant");
        _;
    }
    
    modifier validLoan(uint256 _loanId) {
        AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
        require(loan.id == _loanId, "Loan does not exist");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _acnAddress) {
        acn = AgentCreditNetwork(_acnAddress);
    }
    
    // ============ CONVERSATION MANAGEMENT ============
    
    /**
     * @notice Create a conversation thread for a loan
     * @param _loanId Loan ID to create conversation for
     */
    function createConversation(uint256 _loanId) external validLoan(_loanId) {
        require(conversations[_loanId].loanId == 0, "Conversation already exists");
        
        AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
        
        conversations[_loanId] = Conversation({
            loanId: _loanId,
            borrower: loan.borrower,
            lender: loan.lender,
            messageCount: 0,
            lastMessageAt: block.timestamp,
            isActive: true
        });
        
        emit ConversationCreated(_loanId, loan.borrower, loan.lender);
    }
    
    /**
     * @notice Send a message in a loan conversation
     * @param _loanId Loan ID / conversation ID
     * @param _content Message content (max 1000 chars)
     */
    function sendMessage(
        uint256 _loanId,
        string calldata _content
    ) external onlyLoanParticipant(_loanId) validLoan(_loanId) {
        require(bytes(_content).length > 0, "Message cannot be empty");
        require(bytes(_content).length <= 1000, "Message too long (max 1000 chars)");
        
        // Auto-create conversation if it doesn't exist
        if (conversations[_loanId].loanId == 0) {
            AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
            conversations[_loanId] = Conversation({
                loanId: _loanId,
                borrower: loan.borrower,
                lender: loan.lender,
                messageCount: 0,
                lastMessageAt: block.timestamp,
                isActive: true
            });
            emit ConversationCreated(_loanId, loan.borrower, loan.lender);
        }
        
        messageCounter++;
        
        messages[_loanId].push(Message({
            id: messageCounter,
            loanId: _loanId,
            sender: msg.sender,
            content: _content,
            timestamp: block.timestamp,
            isRead: false
        }));
        
        conversations[_loanId].messageCount++;
        conversations[_loanId].lastMessageAt = block.timestamp;
        
        emit MessageSent(messageCounter, _loanId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Mark messages as read
     * @param _loanId Loan ID
     * @param _messageIds Array of message IDs to mark as read
     */
    function markAsRead(uint256 _loanId, uint256[] calldata _messageIds) external onlyLoanParticipant(_loanId) {
        uint256 markedCount = 0;
        
        for (uint256 i = 0; i < _messageIds.length; i++) {
            uint256 msgIndex = _messageIds[i] - 1; // Messages are 1-indexed in ID but 0-indexed in array
            
            // Find the message with this ID
            for (uint256 j = 0; j < messages[_loanId].length; j++) {
                if (messages[_loanId][j].id == _messageIds[i]) {
                    if (!messages[_loanId][j].isRead && messages[_loanId][j].sender != msg.sender) {
                        messages[_loanId][j].isRead = true;
                        markedCount++;
                    }
                    break;
                }
            }
        }
        
        if (markedCount > 0) {
            emit MessagesRead(_loanId, msg.sender, markedCount);
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get all messages for a loan
     * @param _loanId Loan ID
     * @return Array of messages
     */
    function getMessages(uint256 _loanId) external view returns (Message[] memory) {
        return messages[_loanId];
    }
    
    /**
     * @notice Get messages with pagination
     * @param _loanId Loan ID
     * @param _page Page number (0-indexed)
     * @param _pageSize Messages per page
     * @return Array of messages for the page
     */
    function getMessagesPaginated(
        uint256 _loanId,
        uint256 _page,
        uint256 _pageSize
    ) external view returns (Message[] memory) {
        require(_pageSize > 0, "Page size must be positive");
        
        Message[] storage loanMessages = messages[_loanId];
        uint256 start = _page * _pageSize;
        
        if (start >= loanMessages.length) {
            return new Message[](0);
        }
        
        uint256 end = start + _pageSize;
        if (end > loanMessages.length) {
            end = loanMessages.length;
        }
        
        uint256 resultLength = end - start;
        Message[] memory result = new Message[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = loanMessages[start + i];
        }
        
        return result;
    }
    
    /**
     * @notice Get unread message count for a participant
     * @param _loanId Loan ID
     * @param _participant Address to check
     * @return Unread count
     */
    function getUnreadCount(uint256 _loanId, address _participant) external view returns (uint256) {
        uint256 count = 0;
        Message[] storage loanMessages = messages[_loanId];
        
        for (uint256 i = 0; i < loanMessages.length; i++) {
            if (!loanMessages[i].isRead && loanMessages[i].sender != _participant) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @notice Get conversation details
     */
    function getConversation(uint256 _loanId) external view returns (Conversation memory) {
        return conversations[_loanId];
    }
    
    /**
     * @notice Get all active conversations for an agent
     * @param _agent Agent address
     * @param _maxResults Maximum number of results
     * @return Array of loan IDs with active conversations
     */
    function getAgentConversations(
        address _agent,
        uint256 _maxResults
    ) external view returns (uint256[] memory) {
        // This is expensive - would need off-chain indexing for production
        // For now, return limited results
        uint256[] memory result = new uint256[](_maxResults);
        uint256 count = 0;
        
        // We can't iterate all loans efficiently on-chain
        // This is a placeholder - in production, use events + off-chain indexing
        
        return result;
    }
    
    /**
     * @notice Check if an address is a participant in a loan
     */
    function isParticipant(uint256 _loanId, address _addr) external view returns (bool) {
        return _isParticipant(_loanId, _addr);
    }
    
    /**
     * @notice Get latest message for a loan
     */
    function getLatestMessage(uint256 _loanId) external view returns (Message memory) {
        require(messages[_loanId].length > 0, "No messages");
        return messages[_loanId][messages[_loanId].length - 1];
    }
    
    /**
     * @notice Get message count for a loan
     */
    function getMessageCount(uint256 _loanId) external view returns (uint256) {
        return messages[_loanId].length;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _isParticipant(uint256 _loanId, address _addr) internal view returns (bool) {
        AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
        return (_addr == loan.borrower || _addr == loan.lender);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updateACNAddress(address _newACN) external {
        // Only owner of ACN can update
        require(msg.sender == address(acn), "Not authorized");
        acn = AgentCreditNetwork(_newACN);
    }
}